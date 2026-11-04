-- ========================================================
-- AŞAMA 2: Öğretmen paneli gerçek veri modeli
--  * Öğrenciler okula bağlanır; öğretmen yalnızca kendi okulunun öğrencilerini görür
--  * teacher_classes  : öğretmenin sınıfları
--  * homeworks        : öğretmene + sınıfa bağlanır
--  * homework_checks  : ödev kontrolü (yaptı / kısmen / yapmadı + puan + not)
--  * grades           : yazılı / sözlü / performans notları
--  * staff_give_points: artı/eksi puan (sunucuda, tek işlemde)
--  * messages         : konuşma bazlı yetki (ogr:<öğrenci> ve sinif:<okul>:<sınıf>)
-- ========================================================

-- Oturumdaki personelin okulu
create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select school_id from public.profiles where id = auth.uid();
$$;
revoke execute on function public.my_school_id() from public, anon;
grant execute on function public.my_school_id() to authenticated;

-- --------------------------------------------------------
-- ÖĞRENCİLER: okul bağlantısı
-- --------------------------------------------------------
alter table public.students add column if not exists school_id uuid references public.schools(id);
create index if not exists students_school_class_idx on public.students (school_id, class_name);

-- Personel bu öğrenciyi görebilir mi? (admin: hepsi, öğretmen: kendi okulu)
create or replace function public.staff_can_see_student(p_student_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.is_staff() and exists (
      select 1 from public.students s
      where s.id = p_student_id and s.school_id is not distinct from public.my_school_id()
    )
  );
$$;
revoke execute on function public.staff_can_see_student(uuid) from public, anon;
grant execute on function public.staff_can_see_student(uuid) to authenticated;

drop policy if exists students_select on public.students;
create policy students_select on public.students for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id()))
    or id = (select public.current_student_id())
  );
drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students for update to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id())))
  with check ((select public.is_admin()) or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id())));

-- Öğrenci ekleme: okul, ekleyen personelin okulu olur
create or replace function public.staff_create_student(
  p_student_number text,
  p_name text,
  p_class_name text,
  p_pin text
)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if coalesce(trim(p_student_number), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'Okul numarası ve ad soyad zorunludur.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;

  insert into public.students (student_number, name, class_name, school_id)
  values (
    trim(p_student_number),
    left(trim(p_name), 120),
    left(trim(coalesce(p_class_name, '')), 20),
    public.my_school_id()
  )
  returning id into v_id;

  insert into public.student_credentials (student_id, pin_hash)
  values (v_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  return v_id;
end;
$$;

-- PIN sıfırlama: yalnızca görebildiği öğrenci
create or replace function public.staff_set_student_pin(p_student_id uuid, p_pin text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.staff_can_see_student(p_student_id) then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;
  update public.student_credentials
     set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf')),
         failed_pin_attempts = 0,
         pin_locked_until = null,
         updated_at = now()
   where student_id = p_student_id;
  if not found then
    insert into public.student_credentials (student_id, pin_hash)
    values (p_student_id, extensions.crypt(p_pin, extensions.gen_salt('bf')));
  end if;
  -- Açık oturumları kapat
  delete from public.student_sessions where student_id = p_student_id;
end;
$$;

-- Sıralama: personel kendi okulunu, öğrenci kendi sınıfını görür
create or replace function public.class_leaderboard()
returns table (
  id uuid,
  student_number text,
  name text,
  class_name text,
  avatar text,
  points integer,
  plus_count integer,
  minus_count integer
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.student_number, s.name, s.class_name, s.avatar, s.points, s.plus_count, s.minus_count
  from public.students s
  where public.is_admin()
     or (public.is_staff() and s.school_id is not distinct from public.my_school_id())
     or exists (
       select 1 from public.students me
       where me.id = public.current_student_id()
         and me.class_name = s.class_name
         and me.school_id is not distinct from s.school_id
     )
  order by s.points desc, s.name;
$$;

-- --------------------------------------------------------
-- PUAN: artı / eksi (tek işlemde, gerekçe ve öğretmen adı sunucuda)
-- --------------------------------------------------------
drop policy if exists points_select on public.points_history;
create policy points_select on public.points_history for select to authenticated
  using ((select public.staff_can_see_student(student_id)) or student_id = (select public.current_student_id()));
-- Doğrudan ekleme kapatılır; puan yalnızca staff_give_points ile verilir
drop policy if exists points_staff_insert on public.points_history;
revoke insert on public.points_history from authenticated;

create or replace function public.staff_give_points(p_student_id uuid, p_delta integer, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_points integer;
  v_teacher text;
begin
  if not public.staff_can_see_student(p_student_id) then
    raise exception 'Bu öğrenciye puan veremezsiniz.' using errcode = '42501';
  end if;
  if p_delta = 0 or p_delta < -10 or p_delta > 10 then
    raise exception 'Puan -10 ile +10 arasında ve sıfırdan farklı olmalıdır.';
  end if;

  update public.students
     set points = coalesce(points, 0) + p_delta,
         plus_count = coalesce(plus_count, 0) + case when p_delta > 0 then 1 else 0 end,
         minus_count = coalesce(minus_count, 0) + case when p_delta < 0 then 1 else 0 end
   where id = p_student_id
  returning points into v_points;

  select coalesce(nullif(full_name, ''), 'Öğretmen') into v_teacher from public.profiles where id = auth.uid();

  insert into public.points_history (student_id, teacher_name, change_type, amount, reason)
  values (
    p_student_id,
    v_teacher,
    case when p_delta > 0 then 'plus' else 'minus' end,
    p_delta,
    left(coalesce(nullif(trim(p_reason), ''), case when p_delta > 0 then 'Olumlu davranış' else 'Olumsuz davranış' end), 200)
  );
  return v_points;
end;
$$;
revoke execute on function public.staff_give_points(uuid, integer, text) from public, anon;
grant execute on function public.staff_give_points(uuid, integer, text) to authenticated;

-- --------------------------------------------------------
-- ÖĞRETMENİN SINIFLARI
-- --------------------------------------------------------
create table if not exists public.teacher_classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  class_name text not null check (char_length(trim(class_name)) between 1 and 20),
  created_at timestamptz not null default now(),
  unique (teacher_id, class_name)
);
alter table public.teacher_classes enable row level security;
revoke all on public.teacher_classes from anon;
grant select, insert, delete on public.teacher_classes to authenticated;

drop policy if exists teacher_classes_select on public.teacher_classes;
create policy teacher_classes_select on public.teacher_classes for select to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists teacher_classes_insert on public.teacher_classes;
create policy teacher_classes_insert on public.teacher_classes for insert to authenticated
  with check (teacher_id = (select auth.uid()) and (select public.is_staff()));
drop policy if exists teacher_classes_delete on public.teacher_classes;
create policy teacher_classes_delete on public.teacher_classes for delete to authenticated
  using (teacher_id = (select auth.uid()));

-- --------------------------------------------------------
-- ÖDEVLER: öğretmene, okula ve sınıfa bağlanır
-- --------------------------------------------------------
alter table public.homeworks add column if not exists teacher_id uuid default auth.uid() references public.profiles(id) on delete set null;
alter table public.homeworks add column if not exists school_id uuid default public.my_school_id() references public.schools(id);
alter table public.homeworks add column if not exists class_name text;
alter table public.homeworks add column if not exists description text;
alter table public.homeworks add column if not exists due_date date;
create index if not exists homeworks_class_idx on public.homeworks (school_id, class_name);

-- Öğretmen adı ve okul sunucuda belirlenir
create or replace function public.homeworks_set_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
  else
    new.teacher_id := old.teacher_id;
    new.school_id := old.school_id;
  end if;
  select coalesce(nullif(full_name, ''), 'Öğretmen') into new.teacher_name from public.profiles where id = new.teacher_id;
  new.teacher_name := coalesce(new.teacher_name, 'Öğretmen');
  return new;
end;
$$;
revoke execute on function public.homeworks_set_owner() from public, anon, authenticated;
drop trigger if exists homeworks_set_owner on public.homeworks;
create trigger homeworks_set_owner before insert or update on public.homeworks
  for each row execute function public.homeworks_set_owner();

drop policy if exists homeworks_select on public.homeworks;
create policy homeworks_select on public.homeworks for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id()))
    or exists (
      select 1 from public.students me
      where me.id = (select public.current_student_id())
        and me.class_name = homeworks.class_name
        and me.school_id is not distinct from homeworks.school_id
    )
  );
drop policy if exists homeworks_staff_write on public.homeworks;
drop policy if exists homeworks_insert on public.homeworks;
create policy homeworks_insert on public.homeworks for insert to authenticated
  with check ((select public.is_staff()));
drop policy if exists homeworks_update on public.homeworks;
create policy homeworks_update on public.homeworks for update to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_admin()))
  with check (teacher_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists homeworks_delete on public.homeworks;
create policy homeworks_delete on public.homeworks for delete to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_admin()));

-- --------------------------------------------------------
-- ÖDEV KONTROLÜ
-- --------------------------------------------------------
create table if not exists public.homework_checks (
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null check (status in ('yapti', 'kismen', 'yapmadi')),
  score integer check (score between 0 and 1000),
  note text check (char_length(note) <= 300),
  checked_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (homework_id, student_id)
);
alter table public.homework_checks enable row level security;
revoke all on public.homework_checks from anon;
grant select, insert, update, delete on public.homework_checks to authenticated;

-- Ödevin sahibi öğretmen (veya admin) kontrol girebilir
create or replace function public.owns_homework(p_homework_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.homeworks h where h.id = p_homework_id and h.teacher_id = auth.uid() and public.is_staff()
  );
$$;
revoke execute on function public.owns_homework(uuid) from public, anon;
grant execute on function public.owns_homework(uuid) to authenticated;

drop policy if exists homework_checks_select on public.homework_checks;
create policy homework_checks_select on public.homework_checks for select to authenticated
  using ((select public.owns_homework(homework_id)) or student_id = (select public.current_student_id()));
drop policy if exists homework_checks_write on public.homework_checks;
create policy homework_checks_write on public.homework_checks for all to authenticated
  using ((select public.owns_homework(homework_id)) and (select public.staff_can_see_student(student_id)))
  with check ((select public.owns_homework(homework_id)) and (select public.staff_can_see_student(student_id)));

-- --------------------------------------------------------
-- NOTLAR
-- --------------------------------------------------------
create table if not exists public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  teacher_id uuid default auth.uid() references public.profiles(id) on delete set null,
  subject text not null check (char_length(trim(subject)) between 1 and 80),
  exam text not null check (exam in ('yazili1', 'yazili2', 'yazili3', 'sozlu1', 'sozlu2', 'performans1', 'performans2', 'proje')),
  score numeric(5, 2) not null check (score between 0 and 100),
  updated_at timestamptz not null default now(),
  unique (student_id, subject, exam)
);
alter table public.grades enable row level security;
revoke all on public.grades from anon;
grant select, insert, update, delete on public.grades to authenticated;

drop policy if exists grades_select on public.grades;
create policy grades_select on public.grades for select to authenticated
  using ((select public.staff_can_see_student(student_id)) or student_id = (select public.current_student_id()));
drop policy if exists grades_write on public.grades;
create policy grades_write on public.grades for all to authenticated
  using ((select public.staff_can_see_student(student_id)))
  with check ((select public.staff_can_see_student(student_id)));

create or replace function public.grades_touch()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.teacher_id := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.grades_touch() from public, anon, authenticated;
drop trigger if exists grades_touch on public.grades;
create trigger grades_touch before insert or update on public.grades
  for each row execute function public.grades_touch();

-- --------------------------------------------------------
-- MESAJLAR: konuşma bazlı yetki
--   ogr:<öğrenci id>             -> o öğrencinin velisi ile öğretmenler
--   sinif:<okul id|none>:<sınıf> -> sınıf grubu (veli okur, personel yazar)
-- --------------------------------------------------------
create or replace function public.class_conversation_id(p_school_id uuid, p_class_name text)
returns text language sql immutable set search_path = '' as $$
  select 'sinif:' || coalesce(p_school_id::text, 'none') || ':' || coalesce(p_class_name, '');
$$;
grant execute on function public.class_conversation_id(uuid, text) to authenticated;

create or replace function public.can_read_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then true
    when public.is_staff() then
      (p_conv like 'ogr:%' and exists (
        select 1 from public.students s
        where s.id::text = substr(p_conv, 5) and s.school_id is not distinct from public.my_school_id()
      ))
      or (p_conv like 'sinif:%' and split_part(p_conv, ':', 2) = coalesce(public.my_school_id()::text, 'none'))
    else
      exists (
        select 1 from public.students me
        where me.id = public.current_student_id()
          and (p_conv = 'ogr:' || me.id::text or p_conv = public.class_conversation_id(me.school_id, me.class_name))
      )
  end;
$$;
revoke execute on function public.can_read_conversation(text) from public, anon;
grant execute on function public.can_read_conversation(text) to authenticated;

create or replace function public.can_write_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.can_read_conversation(p_conv)
     and (public.is_staff() or p_conv like 'ogr:%');
$$;
revoke execute on function public.can_write_conversation(text) from public, anon;
grant execute on function public.can_write_conversation(text) to authenticated;

drop policy if exists messages_select on public.messages;
create policy messages_select on public.messages for select to authenticated
  using ((select public.can_read_conversation(conversation_id)));
drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check ((select public.can_write_conversation(conversation_id)));
drop policy if exists messages_update on public.messages;
create policy messages_update on public.messages for update to authenticated
  using ((select public.can_read_conversation(conversation_id)))
  with check ((select public.can_read_conversation(conversation_id)));

-- Gönderen adı da sunucuda belirlenir (istemciden gelen ad yok sayılır)
create or replace function public.messages_set_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.sender_id := auth.uid()::text;
  if public.is_staff() then
    new.sender_role := case when public.is_admin() then 'admin' else 'teacher' end;
    select coalesce(nullif(full_name, ''), 'Öğretmen') into new.sender_name from public.profiles where id = auth.uid();
  else
    new.sender_role := 'parent';
    select s.name || ' velisi' into new.sender_name from public.students s where s.id = public.current_student_id();
  end if;
  new.sender_name := coalesce(new.sender_name, 'Kullanıcı');
  new.is_read := false;
  return new;
end;
$$;
create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
