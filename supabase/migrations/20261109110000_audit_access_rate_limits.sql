-- ========================================================
-- Paket 8 · Güvenlik ve KVKK
--  1) İşlem kaydı (audit_log): kim, ne zaman, hangi kaydı ekledi/değiştirdi/sildi
--     (değişen alanların eski ve yeni değeriyle). PIN gibi gizli alanlar '***' yazılır.
--  2) Erişim kaydı (access_log): personelin hangi öğrencinin verisini görüntülediği.
--  3) Genel istek hız sınırları: yazma işlemlerinde kullanıcı başına dakikalık sınır.
-- Kayıtları yalnızca süper admin (hepsi) ve okul yöneticisi (kendi okulu) görür.
-- Kimse bu tablolara doğrudan yazamaz; yalnızca trigger ve fonksiyonlar yazar.
-- ========================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- --------------------------------------------------------
-- Ortak: işlemi yapanın türü
-- --------------------------------------------------------
create or replace function private.actor_kind()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() is null then 'system'
    when public.current_student_id() is not null then 'student'
    when public.is_admin() then 'admin'
    when public.is_staff() then 'staff'
    else 'user'
  end;
$$;
revoke all on function private.actor_kind() from public, anon, authenticated;

-- ========================================================
-- 1) İŞLEM KAYDI
-- ========================================================
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_kind text not null,
  actor_student_id uuid,
  school_id uuid,
  table_name text not null,
  row_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE', 'RESTORE', 'ERASE')),
  old_data jsonb,
  new_data jsonb
);
create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_school_at_idx on public.audit_log (school_id, at desc);
create index if not exists audit_log_row_idx on public.audit_log (table_name, row_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated;
grant select on public.audit_log to authenticated;
drop policy if exists audit_log_select on public.audit_log;
create policy audit_log_select on public.audit_log for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_school_admin()) and school_id = (select public.my_school_id()))
  );

-- Trigger argümanları: [0] gizlenecek sütunlar (virgüllü), [1] değişimi kayda değmeyen sütunlar (virgüllü)
create or replace function private.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_redact text[] := case when TG_NARGS > 0 and TG_ARGV[0] <> '' then string_to_array(TG_ARGV[0], ',') else '{}'::text[] end;
  v_ignore text[] := case when TG_NARGS > 1 and TG_ARGV[1] <> '' then string_to_array(TG_ARGV[1], ',') else '{}'::text[] end;
  o jsonb;
  n jsonb;
  r jsonb;
  k text;
  v_school uuid;
begin
  -- Öğrenci silinince alt kayıtlar zincirleme (cascade) silinir; bunlar tek tek yazılmaz
  -- (öğrencinin silinmesi kaydedilir, verinin kopyası "silinenler" kutusunda durur).
  -- (Zincirleme silmede pg_trigger_depth artmıyor; bu yüzden öğrencisi artık olmayan alt kayıt da atlanır.)
  if TG_OP = 'DELETE' and (
    pg_trigger_depth() > 1
    or (TG_TABLE_NAME <> 'students' and to_jsonb(OLD) ? 'student_id'
        and not exists (select 1 from public.students s where s.id = public.try_uuid(to_jsonb(OLD) ->> 'student_id')))
  ) then
    return null;
  end if;

  if TG_OP <> 'INSERT' then o := to_jsonb(OLD); end if;
  if TG_OP <> 'DELETE' then n := to_jsonb(NEW); end if;

  if TG_OP = 'UPDATE' then
    select jsonb_object_agg(e.key, e.value) into r
    from jsonb_each(n) e
    where (o -> e.key) is distinct from e.value
      and e.key <> all (v_ignore || array['updated_at']);
    if r is null then
      return null; -- kayda değer değişiklik yok
    end if;
    select jsonb_object_agg(e.key, e.value) into o from jsonb_each(o) e where r ? e.key;
    n := r;
  end if;

  foreach k in array v_redact loop
    if o ? k then o := jsonb_set(o, array[k], '"***"'); end if;
    if n ? k then n := jsonb_set(n, array[k], '"***"'); end if;
  end loop;

  r := coalesce(to_jsonb(NEW), to_jsonb(OLD));
  v_school := public.try_uuid(r ->> 'school_id');
  if v_school is null and r ? 'student_id' then
    select s.school_id into v_school from public.students s where s.id = public.try_uuid(r ->> 'student_id');
  end if;

  insert into public.audit_log (actor_id, actor_kind, actor_student_id, school_id, table_name, row_id, action, old_data, new_data)
  values (
    auth.uid(), private.actor_kind(), public.current_student_id(), v_school,
    TG_TABLE_NAME, coalesce(r ->> 'id', r ->> 'student_id'), TG_OP, o, n
  );
  return null;
end;
$$;
revoke all on function private.audit_row() from public, anon, authenticated;

-- Kaydı tutulan tablolar
drop trigger if exists audit_students on public.students;
create trigger audit_students after insert or update or delete on public.students
  for each row execute function private.audit_row('', 'points,plus_count,minus_count');

drop trigger if exists audit_student_credentials on public.student_credentials;
create trigger audit_student_credentials after update on public.student_credentials
  for each row when (old.pin_hash is distinct from new.pin_hash)
  execute function private.audit_row('pin_hash,pin_enc', 'failed_pin_attempts,pin_locked_until');

drop trigger if exists audit_points_history on public.points_history;
create trigger audit_points_history after insert or delete on public.points_history
  for each row execute function private.audit_row();

drop trigger if exists audit_grades on public.grades;
create trigger audit_grades after insert or update or delete on public.grades
  for each row execute function private.audit_row();

drop trigger if exists audit_homework_checks on public.homework_checks;
create trigger audit_homework_checks after insert or update or delete on public.homework_checks
  for each row execute function private.audit_row();

drop trigger if exists audit_homeworks on public.homeworks;
create trigger audit_homeworks after insert or update or delete on public.homeworks
  for each row execute function private.audit_row();

drop trigger if exists audit_homework_submissions on public.homework_submissions;
create trigger audit_homework_submissions after insert or update or delete on public.homework_submissions
  for each row execute function private.audit_row();

drop trigger if exists audit_reading_contests on public.reading_contests;
create trigger audit_reading_contests after insert or update or delete on public.reading_contests
  for each row execute function private.audit_row();

drop trigger if exists audit_reading_results on public.reading_results;
create trigger audit_reading_results after insert or update or delete on public.reading_results
  for each row execute function private.audit_row();

drop trigger if exists audit_announcements on public.announcements;
create trigger audit_announcements after insert or update or delete on public.announcements
  for each row execute function private.audit_row();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles after insert or update or delete on public.profiles
  for each row execute function private.audit_row();

drop trigger if exists audit_schools on public.schools;
create trigger audit_schools after insert or update or delete on public.schools
  for each row execute function private.audit_row();

drop trigger if exists audit_teacher_classes on public.teacher_classes;
create trigger audit_teacher_classes after insert or update or delete on public.teacher_classes
  for each row execute function private.audit_row();

drop trigger if exists audit_class_members on public.class_members;
create trigger audit_class_members after insert or update or delete on public.class_members
  for each row execute function private.audit_row();

-- ========================================================
-- 2) ERİŞİM KAYDI
-- ========================================================
create table if not exists public.access_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor_id uuid,
  actor_kind text not null,
  school_id uuid,
  student_id uuid not null,
  action text not null
);
create index if not exists access_log_school_at_idx on public.access_log (school_id, at desc);
create index if not exists access_log_student_at_idx on public.access_log (student_id, at desc);
create index if not exists access_log_actor_idx on public.access_log (actor_id, student_id, action, at desc);

alter table public.access_log enable row level security;
revoke all on public.access_log from public, anon, authenticated;
grant select on public.access_log to authenticated;
drop policy if exists access_log_select on public.access_log;
create policy access_log_select on public.access_log for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_school_admin()) and school_id = (select public.my_school_id()))
  );

-- Aynı kişi aynı öğrenciyi aynı şekilde 10 dakika içinde tekrar açarsa yeni satır yazılmaz
create or replace function private.log_access(p_student_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null or p_student_id is null then
    return;
  end if;
  if exists (
    select 1 from public.access_log a
    where a.actor_id = auth.uid() and a.student_id = p_student_id and a.action = p_action
      and a.at > now() - interval '10 minutes'
  ) then
    return;
  end if;
  insert into public.access_log (actor_id, actor_kind, school_id, student_id, action)
  select auth.uid(), private.actor_kind(), s.school_id, s.id, p_action
  from public.students s where s.id = p_student_id;
end;
$$;
revoke all on function private.log_access(uuid, text) from public, anon, authenticated;

-- Arayüzün çağırdığı kayıt fonksiyonu (öğrenci profili, rapor, mesajlar açıldığında)
create or replace function public.log_student_access(p_student_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_action not in ('profile', 'report', 'messages', 'grades') then
    raise exception 'Geçersiz erişim türü.';
  end if;
  if not public.staff_can_see_student(p_student_id) then
    return;
  end if;
  perform private.log_access(p_student_id, p_action);
end;
$$;
revoke all on function public.log_student_access(uuid, text) from public, anon;
grant execute on function public.log_student_access(uuid, text) to authenticated;

-- PIN'lerin okunması her zaman kaydedilir
create or replace function public.staff_list_student_pins(p_student_ids uuid[])
returns table (student_id uuid, pin text)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  perform private.log_access(x, 'pins')
  from unnest(p_student_ids) x
  where exists (select 1 from public.student_credentials c where c.student_id = x and c.pin_enc is not null)
    and public.staff_can_manage_student(x);

  v_key := private.student_pin_key();
  return query
    select c.student_id,
           case when c.pin_enc is null then null else extensions.pgp_sym_decrypt(c.pin_enc, v_key) end
    from public.student_credentials c
    where c.student_id = any (p_student_ids)
      and public.staff_can_manage_student(c.student_id);
end;
$$;
revoke all on function public.staff_list_student_pins(uuid[]) from public, anon;
grant execute on function public.staff_list_student_pins(uuid[]) to authenticated;

-- ========================================================
-- 3) GENEL İSTEK HIZ SINIRLARI
-- ========================================================
create table if not exists private.rate_events (
  actor uuid not null,
  bucket text not null,
  at timestamptz not null default now()
);
create index if not exists rate_events_actor_bucket_at on private.rate_events (actor, bucket, at);

create or replace function private.check_rate(p_bucket text, p_max integer, p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_count integer;
begin
  if v_actor is null then
    return; -- sunucu/sistem işlemleri sınırlanmaz
  end if;
  if random() < 0.02 then
    delete from private.rate_events where at < now() - interval '1 day';
  end if;
  select count(*) into v_count
  from private.rate_events
  where actor = v_actor and bucket = p_bucket and at > now() - make_interval(secs => p_window_seconds);
  if v_count >= p_max then
    raise exception 'Çok sık işlem yapıldı. Lütfen biraz bekleyip tekrar deneyin.'
      using errcode = 'P0429', hint = 'rate_limited';
  end if;
  insert into private.rate_events (actor, bucket) values (v_actor, p_bucket);
end;
$$;
revoke all on function private.check_rate(text, integer, integer) from public, anon, authenticated;

-- Trigger argümanları: [0] kova adı, [1] en çok işlem, [2] süre (saniye)
create or replace function private.rate_limit_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.check_rate(TG_ARGV[0], TG_ARGV[1]::integer, TG_ARGV[2]::integer);
  return NEW;
end;
$$;
revoke all on function private.rate_limit_trigger() from public, anon, authenticated;

drop trigger if exists rate_limit_messages on public.messages;
create trigger rate_limit_messages before insert on public.messages
  for each row execute function private.rate_limit_trigger('messages', '30', '60');

drop trigger if exists rate_limit_homework_submissions on public.homework_submissions;
create trigger rate_limit_homework_submissions before insert on public.homework_submissions
  for each row execute function private.rate_limit_trigger('submissions', '30', '60');

drop trigger if exists rate_limit_announcements on public.announcements;
create trigger rate_limit_announcements before insert on public.announcements
  for each row execute function private.rate_limit_trigger('announcements', '20', '300');

drop trigger if exists rate_limit_teacher_files on public.teacher_files;
create trigger rate_limit_teacher_files before insert on public.teacher_files
  for each row execute function private.rate_limit_trigger('files', '100', '300');

drop trigger if exists rate_limit_quiz_questions on public.quiz_questions;
create trigger rate_limit_quiz_questions before insert on public.quiz_questions
  for each row execute function private.rate_limit_trigger('questions', '200', '300');

drop trigger if exists rate_limit_points_history on public.points_history;
create trigger rate_limit_points_history before insert on public.points_history
  for each row execute function private.rate_limit_trigger('points', '600', '60');

drop trigger if exists rate_limit_class_members on public.class_members;
create trigger rate_limit_class_members before insert on public.class_members
  for each row execute function private.rate_limit_trigger('class_members', '200', '300');

drop trigger if exists rate_limit_boards on public.boards;
create trigger rate_limit_boards before insert on public.boards
  for each row execute function private.rate_limit_trigger('boards', '60', '300');

drop trigger if exists rate_limit_students on public.students;
create trigger rate_limit_students before insert on public.students
  for each row execute function private.rate_limit_trigger('students', '300', '300');

-- Sınıf kodu deneme-yanılmayla bulunamasın: 10 dakikada en çok 10 deneme.
-- Yanlış kod hata fırlatmaz, { error } döner; hata işlemi geri alacağı için deneme sayılmazdı.
create or replace function public.join_class_with_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.current_student_id();
  v_norm text;
  c public.class_join_codes;
  me public.students;
  v_status text;
begin
  if v_student is null then raise exception 'Önce öğrenci olarak giriş yapın.'; end if;
  perform private.check_rate('join_code', 10, 600);
  -- Büyük harf, boşluk/tire yok; karışan harfler düzeltilir (O→0, I/L→1)
  v_norm := translate(upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g')), 'OIL', '011');
  select * into c from public.class_join_codes where code = v_norm;
  select * into me from public.students where id = v_student;
  if c.code is null or c.school_id is distinct from me.school_id then
    return jsonb_build_object('error', 'Bu kod geçersiz. Öğretmeninden kodu yeniden iste.');
  end if;
  if c.class_name = me.class_name then
    raise exception 'Zaten bu sınıfın öğrencisisin.';
  end if;
  insert into public.class_members (student_id, class_name) values (v_student, c.class_name)
  on conflict (student_id, class_name) do nothing;
  select status into v_status from public.class_members where student_id = v_student and class_name = c.class_name;
  return jsonb_build_object('class_name', c.class_name, 'status', v_status);
end;
$$;
