-- ========================================================
-- Paket 8 · KVKK
--  1) Yumuşak silme: silinen öğrencinin bütün verisi 30 gün "silinenler" kutusunda durur,
--     bu sürede geri alınabilir. Süre dolunca kopya kendiliğinden temizlenir.
--  2) Öğrenci verisini dışa aktarma (KVKK bilgi talebi) — JSON.
--  3) Veri talepleri (bilgi / silme / düzeltme) kaydı ve kalıcı silme (unutulma hakkı).
--  4) Veli açık rızası: öğrenci kaydında rızanın alındığı tarih, kaydeden ve metin sürümü.
-- Önce 20261109110000_audit_access_rate_limits.sql çalıştırılmış olmalı (audit_log, access_log, check_rate).
-- ========================================================

-- ========================================================
-- 1) SİLİNENLER KUTUSU
-- ========================================================
create table if not exists public.deleted_students (
  student_id uuid primary key,
  school_id uuid,
  name text not null,
  student_number text not null,
  class_name text,
  data jsonb not null,
  deleted_by uuid,
  deleted_at timestamptz not null default now(),
  purge_after timestamptz not null default now() + interval '30 days'
);
create index if not exists deleted_students_school_idx on public.deleted_students (school_id, deleted_at desc);
alter table public.deleted_students enable row level security;
revoke all on public.deleted_students from public, anon, authenticated;
-- Politika yok: yalnızca aşağıdaki fonksiyonlar erişir.

-- Öğrencinin bütün verisinin kopyası (öğrenci silinince zincirleme silinen her şey + birebir mesajları)
create or replace function private.student_snapshot(p_student_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'students',             (select jsonb_agg(to_jsonb(t)) from public.students t where t.id = p_student_id),
    'student_credentials',  (select jsonb_agg(to_jsonb(t)) from public.student_credentials t where t.student_id = p_student_id),
    'points_history',       (select jsonb_agg(to_jsonb(t)) from public.points_history t where t.student_id = p_student_id),
    'grades',               (select jsonb_agg(to_jsonb(t)) from public.grades t where t.student_id = p_student_id),
    'homework_checks',      (select jsonb_agg(to_jsonb(t)) from public.homework_checks t where t.student_id = p_student_id),
    'homework_submissions', (select jsonb_agg(to_jsonb(t)) from public.homework_submissions t where t.student_id = p_student_id),
    'quiz_attempts',        (select jsonb_agg(to_jsonb(t)) from public.quiz_attempts t where t.student_id = p_student_id),
    'quiz_answers',         (select jsonb_agg(to_jsonb(t)) from public.quiz_answers t where t.student_id = p_student_id),
    'reading_results',      (select jsonb_agg(to_jsonb(t)) from public.reading_results t where t.student_id = p_student_id),
    'class_members',        (select jsonb_agg(to_jsonb(t)) from public.class_members t where t.student_id = p_student_id),
    'conversation_reads',   (select jsonb_agg(to_jsonb(t)) from public.conversation_reads t where t.student_id = p_student_id),
    'board_drawings',       (select jsonb_agg(to_jsonb(t)) from public.board_drawings t where t.student_id = p_student_id),
    'messages',             (select jsonb_agg(to_jsonb(t) order by t.created_at) from public.messages t
                              where t.conversation_id in ('ogr:' || p_student_id::text, 'soru:' || p_student_id::text))
  );
$$;
revoke all on function private.student_snapshot(uuid) from public, anon, authenticated;

-- Süresi dolan kopyaları temizle
create or replace function private.purge_deleted_students()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.deleted_students where purge_after <= now();
$$;
revoke all on function private.purge_deleted_students() from public, anon, authenticated;

-- Silinen öğrenciyi kim yönetebilir: admin; okul yöneticisi (kendi okulu); öğretmen (kendi okulu + kendi sınıfı)
create or replace function private.can_manage_deleted(p_school_id uuid, p_class text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_admin() or (
    public.is_staff()
    and p_school_id is not distinct from public.my_school_id()
    and (public.is_school_admin() or public.teacher_has_class(p_class))
  );
$$;
revoke all on function private.can_manage_deleted(uuid, text) from public, anon, authenticated;

-- Silme: artık kalıcı değil; kopya 30 gün saklanır
create or replace function public.staff_delete_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.staff_can_manage_student(p_student_id) then
    raise exception 'Yalnızca kendi sınıflarınızdaki öğrencileri silebilirsiniz.' using errcode = '42501';
  end if;
  perform private.purge_deleted_students();

  insert into public.deleted_students (student_id, school_id, name, student_number, class_name, data, deleted_by)
  select s.id, s.school_id, s.name, s.student_number, s.class_name, private.student_snapshot(s.id), auth.uid()
  from public.students s where s.id = p_student_id
  on conflict (student_id) do update
    set school_id = excluded.school_id, name = excluded.name, student_number = excluded.student_number,
        class_name = excluded.class_name, data = excluded.data, deleted_by = excluded.deleted_by,
        deleted_at = now(), purge_after = now() + interval '30 days';
  if not found then
    raise exception 'Öğrenci bulunamadı.';
  end if;

  delete from public.messages
   where conversation_id in ('ogr:' || p_student_id::text, 'soru:' || p_student_id::text);
  delete from public.students where id = p_student_id;
end;
$$;

-- Silinenler listesi (kullanıcının yönetebildikleri)
create or replace function public.staff_deleted_students()
returns table (
  student_id uuid, name text, student_number text, class_name text,
  school_id uuid, school_name text, deleted_at timestamptz, purge_after timestamptz, deleted_by_name text
)
language sql
stable
security definer
set search_path = ''
as $$
  select d.student_id, d.name, d.student_number, d.class_name, d.school_id, sc.name,
         d.deleted_at, d.purge_after, p.full_name
  from public.deleted_students d
  left join public.schools sc on sc.id = d.school_id
  left join public.profiles p on p.id = d.deleted_by
  where d.purge_after > now()
    and private.can_manage_deleted(d.school_id, d.class_name)
  order by d.deleted_at desc;
$$;
revoke all on function public.staff_deleted_students() from public, anon;
grant execute on function public.staff_deleted_students() to authenticated;

-- Geri alma: kopyadaki bütün kayıtlar geri yazılır.
-- Geri yazılan tablolarda kullanıcı trigger'ları işlem boyunca kapatılır (ALTER TABLE … DISABLE TRIGGER USER):
-- puan ikinci kez verilmesin, mesaj göndereni / sahiplik alanları geri alanın bilgisiyle ezilmesin, hız sınırına
-- takılmasın. Yabancı anahtar kontrolleri açık kalır; bu sürede silinmiş ödev/yarışma/quiz sorusuna ait satırlar
-- atlanır, silinmiş öğretmene işaret eden alanlar boşaltılır. Hepsi tek işlemdir: hata olursa hiçbir şey değişmez.
-- (Supabase, fonksiyon içinden trigger'ları toptan kapatan ayara izin vermediği için bu yol kullanılıyor.)
create or replace function public.staff_restore_student(p_student_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  d public.deleted_students;
  v jsonb;
  t text;
  c_tables constant text[] := array[
    'students', 'student_credentials', 'points_history', 'grades', 'homework_checks', 'homework_submissions',
    'quiz_attempts', 'quiz_answers', 'reading_results', 'class_members', 'conversation_reads', 'board_drawings', 'messages'
  ];
begin
  select * into d from public.deleted_students where student_id = p_student_id and purge_after > now();
  if d.student_id is null then
    raise exception 'Silinen öğrenci bulunamadı (30 günlük süre dolmuş olabilir).';
  end if;
  if not private.can_manage_deleted(d.school_id, d.class_name) then
    raise exception 'Bu öğrenciyi geri alma yetkiniz yok.' using errcode = '42501';
  end if;
  if exists (select 1 from public.students s where s.id = p_student_id) then
    raise exception 'Bu öğrenci zaten kayıtlı.';
  end if;
  if exists (
    select 1 from public.students s
    where s.school_id is not distinct from d.school_id and s.student_number = d.student_number
  ) then
    raise exception 'Okul numarası % şu an başka bir öğrencide. Önce o öğrencinin numarasını değiştirin.', d.student_number;
  end if;
  if d.school_id is not null and not exists (select 1 from public.schools where id = d.school_id) then
    raise exception 'Öğrencinin okulu artık kayıtlı değil; geri alınamaz.';
  end if;

  -- Boş tablolar kopyada null olarak durur (jsonb_agg satır yoksa null döner); boş listeye çevir
  select coalesce(jsonb_object_agg(e.key, case when jsonb_typeof(e.value) = 'array' then e.value else '[]'::jsonb end), '{}'::jsonb)
    into v from jsonb_each(d.data) e;
  -- Tablo kilidi beklenirse 5 saniyede vazgeç (o sırada yoğun bir işlem varsa)
  perform set_config('lock_timeout', '5s', true);
  foreach t in array c_tables loop
    execute format('alter table public.%I disable trigger user', t);
  end loop;

  insert into public.students
    select * from jsonb_populate_recordset(null::public.students, v -> 'students');
  insert into public.student_credentials
    select * from jsonb_populate_recordset(null::public.student_credentials, v -> 'student_credentials');
  insert into public.points_history
    select * from jsonb_populate_recordset(null::public.points_history, v -> 'points_history');
  insert into public.grades
    select * from jsonb_populate_recordset(null::public.grades, v -> 'grades');
  insert into public.homework_checks
    select r.* from jsonb_populate_recordset(null::public.homework_checks, v -> 'homework_checks') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.homework_submissions
    select r.* from jsonb_populate_recordset(null::public.homework_submissions, v -> 'homework_submissions') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.quiz_attempts
    select r.* from jsonb_populate_recordset(null::public.quiz_attempts, v -> 'quiz_attempts') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.quiz_answers
    select r.* from jsonb_populate_recordset(null::public.quiz_answers, v -> 'quiz_answers') r
    where exists (select 1 from public.quiz_attempts a where a.homework_id = r.homework_id and a.student_id = r.student_id)
      and exists (select 1 from public.quiz_items i where i.id = r.item_id);
  insert into public.reading_results
    select r.* from jsonb_populate_recordset(null::public.reading_results, v -> 'reading_results') r
    where exists (select 1 from public.reading_contests c where c.id = r.contest_id);
  insert into public.class_members
    select r.* from jsonb_populate_recordset(null::public.class_members, v -> 'class_members') r
    where r.school_id is null or exists (select 1 from public.schools s where s.id = r.school_id);
  insert into public.conversation_reads
    select * from jsonb_populate_recordset(null::public.conversation_reads, v -> 'conversation_reads');
  insert into public.board_drawings
    select r.* from jsonb_populate_recordset(null::public.board_drawings, v -> 'board_drawings') r
    where exists (select 1 from public.homeworks h where h.id = r.homework_id);
  insert into public.messages
    select * from jsonb_populate_recordset(null::public.messages, v -> 'messages')
    on conflict do nothing;

  -- Bu sürede silinmiş öğretmen/kullanıcıya işaret eden alanlar (ON DELETE SET NULL davranışı)
  update public.grades g set teacher_id = null
   where g.student_id = p_student_id and g.teacher_id is not null
     and not exists (select 1 from public.profiles p where p.id = g.teacher_id);
  update public.homework_checks c set checked_by = null
   where c.student_id = p_student_id and c.checked_by is not null
     and not exists (select 1 from public.profiles p where p.id = c.checked_by);
  update public.reading_results r set measured_by = null
   where r.student_id = p_student_id and r.measured_by is not null
     and not exists (select 1 from public.profiles p where p.id = r.measured_by);
  update public.class_members m set added_by = null
   where m.student_id = p_student_id and m.added_by is not null
     and not exists (select 1 from auth.users u where u.id = m.added_by);

  foreach t in array c_tables loop
    execute format('alter table public.%I enable trigger user', t);
  end loop;

  delete from public.deleted_students where student_id = p_student_id;

  insert into public.audit_log (actor_id, actor_kind, school_id, table_name, row_id, action, new_data)
  values (auth.uid(), private.actor_kind(), d.school_id, 'students', p_student_id::text, 'RESTORE',
          jsonb_build_object('name', d.name, 'student_number', d.student_number, 'class_name', d.class_name));
end;
$$;
revoke all on function public.staff_restore_student(uuid) from public, anon;
grant execute on function public.staff_restore_student(uuid) to authenticated;

-- ========================================================
-- 2) DIŞA AKTARMA (KVKK bilgi talebi)
-- ========================================================
-- Kimler: öğrenciyi yönetebilen öğretmen, okul yöneticisi (kendi okulu), admin
create or replace function private.can_handle_student_data(p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.staff_can_manage_student(p_student_id) or (
    public.is_school_admin()
    and exists (select 1 from public.students s where s.id = p_student_id and s.school_id = public.my_school_id())
  );
$$;
revoke all on function private.can_handle_student_data(uuid) from public, anon, authenticated;

create or replace function public.staff_export_student(p_student_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v jsonb;
begin
  if not private.can_handle_student_data(p_student_id) then
    raise exception 'Bu öğrencinin verisini dışa aktarma yetkiniz yok.' using errcode = '42501';
  end if;
  perform private.check_rate('export', 30, 3600);
  perform private.log_access(p_student_id, 'export');

  v := private.student_snapshot(p_student_id) - 'student_credentials';
  return jsonb_build_object(
    'aciklama', 'Bu dosya öğrencinin e-Okul platformunda kayıtlı bütün kişisel verilerini içerir (KVKK md. 11). Giriş PIN''i güvenlik nedeniyle dahil edilmemiştir.',
    'olusturulma', now(),
    'okul', (select jsonb_build_object('ad', sc.name, 'il', sc.city, 'ilce', sc.district)
             from public.students s join public.schools sc on sc.id = s.school_id where s.id = p_student_id),
    'veri', v,
    'erisim_kaydi', (select jsonb_agg(jsonb_build_object('zaman', a.at, 'islem', a.action, 'kim', coalesce(p.full_name, a.actor_kind)) order by a.at desc)
                     from public.access_log a left join public.profiles p on p.id = a.actor_id
                     where a.student_id = p_student_id)
  );
end;
$$;
revoke all on function public.staff_export_student(uuid) from public, anon;
grant execute on function public.staff_export_student(uuid) to authenticated;

-- ========================================================
-- 3) VERİ TALEPLERİ ve KALICI SİLME
-- ========================================================
create table if not exists public.data_requests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  student_id uuid,
  student_name text not null,
  student_number text,
  kind text not null check (kind in ('export', 'erase', 'correct', 'other')),
  requester_name text not null,
  requester_contact text,
  note text,
  status text not null default 'open' check (status in ('open', 'done', 'rejected')),
  resolution text,
  created_by uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz
);
create index if not exists data_requests_school_idx on public.data_requests (school_id, created_at desc);
create index if not exists data_requests_created_by_idx on public.data_requests (created_by);
create index if not exists data_requests_resolved_by_idx on public.data_requests (resolved_by);

alter table public.data_requests enable row level security;
revoke all on public.data_requests from public, anon, authenticated;
grant select, insert, update on public.data_requests to authenticated;

drop policy if exists data_requests_select on public.data_requests;
create policy data_requests_select on public.data_requests for select to authenticated
  using ((select public.is_admin()) or ((select public.is_school_admin()) and school_id = (select public.my_school_id())));
drop policy if exists data_requests_insert on public.data_requests;
create policy data_requests_insert on public.data_requests for insert to authenticated
  with check ((select public.is_admin()) or ((select public.is_school_admin()) and school_id = (select public.my_school_id())));
drop policy if exists data_requests_update on public.data_requests;
create policy data_requests_update on public.data_requests for update to authenticated
  using ((select public.is_admin()) or ((select public.is_school_admin()) and school_id = (select public.my_school_id())))
  with check ((select public.is_admin()) or ((select public.is_school_admin()) and school_id = (select public.my_school_id())));

drop trigger if exists audit_data_requests on public.data_requests;
create trigger audit_data_requests after insert or update on public.data_requests
  for each row execute function private.audit_row();
drop trigger if exists rate_limit_data_requests on public.data_requests;
create trigger rate_limit_data_requests before insert on public.data_requests
  for each row execute function private.rate_limit_trigger('data_requests', '30', '3600');

-- Kalıcı silme (unutulma hakkı): öğrenci (varsa) + silinenler kopyası + birebir mesajlar silinir;
-- işlem kayıtlarındaki kişisel veriler boşaltılır. Ödev dosyalarının depolama yolları döner:
-- arayüz bunları depolamadan siler (veritabanından depolama dosyası silinemez).
create or replace function public.admin_erase_student(p_student_id uuid, p_request_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school uuid;
  v_paths text[];
begin
  select school_id into v_school from public.students where id = p_student_id;
  if not found then
    select school_id into v_school from public.deleted_students where student_id = p_student_id;
    if not found then
      raise exception 'Öğrenci bulunamadı.';
    end if;
  end if;
  if not (public.is_admin() or (public.is_school_admin() and v_school = public.my_school_id())) then
    raise exception 'Kalıcı silme yalnızca admin veya okul yöneticisi tarafından yapılabilir.' using errcode = '42501';
  end if;

  select coalesce(array_agg(o.name), '{}') into v_paths
  from storage.objects o
  where o.bucket_id = 'homework-submissions' and (storage.foldername(o.name))[2] = p_student_id::text;

  delete from public.messages
   where conversation_id in ('ogr:' || p_student_id::text, 'soru:' || p_student_id::text);
  delete from public.students where id = p_student_id;
  delete from public.deleted_students where student_id = p_student_id;

  -- İşlem kayıtlarında kişisel veri bırakma
  update public.audit_log set old_data = null, new_data = null
   where (table_name = 'students' and row_id = p_student_id::text)
      or old_data ->> 'student_id' = p_student_id::text
      or new_data ->> 'student_id' = p_student_id::text;

  insert into public.audit_log (actor_id, actor_kind, school_id, table_name, row_id, action, new_data)
  values (auth.uid(), private.actor_kind(), v_school, 'students', p_student_id::text, 'ERASE',
          case when p_request_id is null then null else jsonb_build_object('request_id', p_request_id) end);

  if p_request_id is not null then
    update public.data_requests
       set status = 'done', resolved_by = auth.uid(), resolved_at = now(),
           resolution = coalesce(resolution, 'Öğrencinin bütün verisi kalıcı olarak silindi.'),
           student_name = 'Silindi', student_number = null, student_id = null
     where id = p_request_id;
  end if;

  return jsonb_build_object('bucket', 'homework-submissions', 'paths', to_jsonb(v_paths));
end;
$$;
revoke all on function public.admin_erase_student(uuid, uuid) from public, anon;
grant execute on function public.admin_erase_student(uuid, uuid) to authenticated;

-- ========================================================
-- 4) VELİ AÇIK RIZASI
-- ========================================================
alter table public.students add column if not exists guardian_consent_at timestamptz;
alter table public.students add column if not exists guardian_consent_by uuid references auth.users(id) on delete set null;
alter table public.students add column if not exists guardian_consent_version text;
create index if not exists students_guardian_consent_by_idx on public.students (guardian_consent_by);

create or replace function public.staff_set_guardian_consent(p_student_id uuid, p_given boolean, p_version text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.can_handle_student_data(p_student_id) then
    raise exception 'Bu öğrencinin rıza bilgisini değiştirme yetkiniz yok.' using errcode = '42501';
  end if;
  update public.students
     set guardian_consent_at = case when p_given then now() else null end,
         guardian_consent_by = case when p_given then auth.uid() else null end,
         guardian_consent_version = case when p_given then left(coalesce(p_version, 'v1'), 20) else null end
   where id = p_student_id;
end;
$$;
revoke all on function public.staff_set_guardian_consent(uuid, boolean, text) from public, anon;
grant execute on function public.staff_set_guardian_consent(uuid, boolean, text) to authenticated;
