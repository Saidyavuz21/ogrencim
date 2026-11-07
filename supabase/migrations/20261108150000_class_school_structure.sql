-- ========================================================
-- SINIF VE OKUL YAPISI (EduBoard paket 6)
-- 1) Ek gruplar: öğrencinin ana şubesi (students.class_name) kalır; ayrıca seçmeli ders / etüt / kulüp
--    gruplarına üye olabilir (class_members). Ödev, quiz, materyal, okuma yarışması ve grup mesajı
--    grubun üyelerine de görünür. Merkezdeki kural: student_in_class().
-- 2) Sınıf kodu ile katılım: öğrenci 8 karakterli kodla katılım ister, öğretmen onaylar.
-- 3) Okul yöneticisi: profiles.is_school_admin (yalnızca süper admin verir). Kendi okulunun öğretmen
--    başvurularını onaylar, öğretmenleri pasife alır, okulun bütün sınıflarını ve öğrencilerini yönetir.
-- 4) Kampüs: okul → kampüs → sınıf (isteğe bağlı).
-- 5) Okul alanı: okul şablonları ve zümre klasörleri (öğretmen kendi dosyasını okulla/zümreyle paylaşır).
-- 6) Sınıf grubu mesajında kişi başına "okundu" bilgisi.
-- ========================================================

-- --------------------------------------------------------
-- 1) Grup üyeliği
-- --------------------------------------------------------
create table if not exists public.class_members (
  student_id uuid not null references public.students(id) on delete cascade,
  class_name text not null check (char_length(btrim(class_name)) between 1 and 20),
  school_id uuid references public.schools(id),
  status text not null default 'pending' check (status in ('pending', 'approved')),
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (student_id, class_name)
);
create index if not exists class_members_class_idx on public.class_members (school_id, class_name, status);
alter table public.class_members enable row level security;

-- Öğrenci (oturumdaki) bu sınıfta mı: ana şube ya da onaylı grup üyeliği
create or replace function public.student_in_class(p_class text, p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students me
    where me.id = public.current_student_id()
      and me.school_id is not distinct from p_school
      and (
        me.class_name = p_class
        or exists (select 1 from public.class_members m where m.student_id = me.id and m.class_name = p_class and m.status = 'approved')
      )
  );
$$;
revoke execute on function public.student_in_class(text, uuid) from public, anon;
grant execute on function public.student_in_class(text, uuid) to authenticated;

-- Verilen öğrenci bu sınıfta mı (öğretmen tarafı ve iç kurallar için)
create or replace function public.student_is_member(p_student uuid, p_class text, p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.students s
    where s.id = p_student
      and s.school_id is not distinct from p_school
      and (
        s.class_name = p_class
        or exists (select 1 from public.class_members m where m.student_id = s.id and m.class_name = p_class and m.status = 'approved')
      )
  );
$$;
revoke execute on function public.student_is_member(uuid, text, uuid) from public, anon, authenticated;

-- --------------------------------------------------------
-- 3) Okul yöneticisi (önce: aşağıdaki kurallar bunu kullanır)
-- --------------------------------------------------------
alter table public.profiles add column if not exists is_school_admin boolean not null default false;

create or replace function public.is_school_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ogretmen' and approved and is_active and is_school_admin and school_id is not null
  );
$$;
revoke execute on function public.is_school_admin() from public, anon;
grant execute on function public.is_school_admin() to authenticated;

-- Okul yöneticisi okulundaki her sınıfta "kendi sınıfı" yetkisine sahiptir
create or replace function public.teacher_has_class(p_class text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (
    public.is_staff() and coalesce(trim(p_class), '') <> '' and (
      public.is_school_admin()
      or exists (select 1 from public.profiles p where p.id = auth.uid() and p.class_name = p_class)
      or exists (select 1 from public.teacher_classes t where t.teacher_id = auth.uid() and t.class_name = p_class)
    )
  );
$$;

-- Grup üyeliği kuralı: okul öğrenciden, öğretmen ekleyince onaylı; ana şubesine üye olamaz
create or replace function public.class_members_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid;
  v_primary text;
begin
  select school_id, class_name into v_school, v_primary from public.students where id = new.student_id;
  if not found then raise exception 'Öğrenci bulunamadı.'; end if;
  new.class_name := btrim(new.class_name);
  if new.class_name = v_primary then raise exception 'Öğrenci zaten bu sınıfın öğrencisi.'; end if;
  if tg_op = 'INSERT' then
    new.school_id := v_school;
    new.created_at := now();
    if public.is_staff() then
      new.status := 'approved';
      new.added_by := auth.uid();
    else
      new.status := 'pending';
      new.added_by := null;
    end if;
  else
    if new.student_id <> old.student_id or new.class_name <> old.class_name or new.school_id is distinct from old.school_id then
      raise exception 'Yalnızca onay durumu değiştirilebilir.';
    end if;
    if not public.is_staff() and new.status <> old.status then
      raise exception 'Katılımı yalnızca öğretmen onaylayabilir.';
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.class_members_guard() from public, anon, authenticated;
drop trigger if exists class_members_guard on public.class_members;
create trigger class_members_guard before insert or update on public.class_members
  for each row execute function public.class_members_guard();

drop policy if exists class_members_select on public.class_members;
create policy class_members_select on public.class_members for select to authenticated
  using (
    student_id = (select public.current_student_id())
    or ((select public.staff_can_see_student(student_id)) and (select public.teacher_has_class(class_name)))
  );
drop policy if exists class_members_insert on public.class_members;
create policy class_members_insert on public.class_members for insert to authenticated
  with check ((select public.staff_can_see_student(student_id)) and (select public.teacher_has_class(class_name)));
drop policy if exists class_members_update on public.class_members;
create policy class_members_update on public.class_members for update to authenticated
  using ((select public.staff_can_see_student(student_id)) and (select public.teacher_has_class(class_name)))
  with check ((select public.staff_can_see_student(student_id)) and (select public.teacher_has_class(class_name)));
drop policy if exists class_members_delete on public.class_members;
create policy class_members_delete on public.class_members for delete to authenticated
  using (
    student_id = (select public.current_student_id())
    or ((select public.staff_can_see_student(student_id)) and (select public.teacher_has_class(class_name)))
  );
revoke all on public.class_members from anon;
grant select, insert, update, delete on public.class_members to authenticated;

-- Öğretmen: sınıfın listesi (ana şube + onaylı grup üyeleri)
create or replace function public.class_roster(p_class text)
returns table (id uuid, student_number text, name text, class_name text, points integer, plus_count integer, minus_count integer, is_member boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, s.student_number, s.name, s.class_name, s.points, s.plus_count, s.minus_count, s.class_name is distinct from p_class
  from public.students s
  where public.is_staff()
    and s.school_id is not distinct from public.my_school_id()
    and (
      s.class_name = p_class
      or exists (select 1 from public.class_members m where m.student_id = s.id and m.class_name = p_class and m.status = 'approved')
    )
  order by (s.class_name is distinct from p_class), s.student_number;
$$;
revoke execute on function public.class_roster(text) from public, anon;
grant execute on function public.class_roster(text) to authenticated;

-- --------------------------------------------------------
-- 2) Sınıf kodu ile katılım
-- --------------------------------------------------------
create table if not exists public.class_join_codes (
  code text primary key check (code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  class_name text not null check (char_length(btrim(class_name)) between 1 and 20),
  created_at timestamptz not null default now(),
  unique (teacher_id, class_name)
);
alter table public.class_join_codes enable row level security;
drop policy if exists class_join_codes_own on public.class_join_codes;
create policy class_join_codes_own on public.class_join_codes for select to authenticated
  using (teacher_id = (select auth.uid()));
drop policy if exists class_join_codes_delete on public.class_join_codes;
create policy class_join_codes_delete on public.class_join_codes for delete to authenticated
  using (teacher_id = (select auth.uid()));
revoke all on public.class_join_codes from anon;
grant select, delete on public.class_join_codes to authenticated;

-- Öğretmen: sınıf için yeni kod üretir (eskisi geçersiz olur). Crockford Base32, 8 karakter.
create or replace function public.create_class_code(p_class text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_code text;
  v_try integer := 0;
begin
  if not public.teacher_has_class(p_class) or public.my_school_id() is null then
    raise exception 'Yalnızca kendi sınıflarınız için kod oluşturabilirsiniz.' using errcode = '42501';
  end if;
  delete from public.class_join_codes where teacher_id = auth.uid() and class_name = btrim(p_class);
  loop
    v_code := '';
    for i in 1..8 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * 32)::integer, 1);
    end loop;
    begin
      insert into public.class_join_codes (code, teacher_id, school_id, class_name)
      values (v_code, auth.uid(), public.my_school_id(), btrim(p_class));
      return v_code;
    exception when unique_violation then
      v_try := v_try + 1;
      if v_try > 5 then raise; end if;
    end;
  end loop;
end;
$$;
revoke execute on function public.create_class_code(text) from public, anon;
grant execute on function public.create_class_code(text) to authenticated;

-- Öğrenci: kodla katılım ister (öğretmen onaylayana kadar "bekliyor")
create or replace function public.join_class_with_code(p_code text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  v_norm text;
  c public.class_join_codes;
  me public.students;
  v_status text;
begin
  if v_student is null then raise exception 'Önce öğrenci olarak giriş yapın.'; end if;
  -- Büyük harf, boşluk/tire yok; karışan harfler düzeltilir (O→0, I/L→1)
  v_norm := translate(upper(regexp_replace(coalesce(p_code, ''), '[\s-]', '', 'g')), 'OIL', '011');
  select * into c from public.class_join_codes where code = v_norm;
  select * into me from public.students where id = v_student;
  if c.code is null or c.school_id is distinct from me.school_id then
    raise exception 'Bu kod geçersiz. Öğretmeninden kodu yeniden iste.';
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
revoke execute on function public.join_class_with_code(text) from public, anon;
grant execute on function public.join_class_with_code(text) to authenticated;

-- --------------------------------------------------------
-- Öğrenci görünürlüğü: ana şube + gruplar (mevcut kurallar merkezdeki fonksiyona bağlanır)
-- --------------------------------------------------------
drop policy if exists homeworks_select on public.homeworks;
create policy homeworks_select on public.homeworks for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id()))
    or (select public.student_in_class(class_name, school_id))
  );

drop policy if exists reading_contests_select on public.reading_contests;
create policy reading_contests_select on public.reading_contests for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id()))
    or (select public.student_in_class(class_name, school_id))
  );

create or replace function public.student_has_homework(p_homework_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.homeworks h
    where h.id = p_homework_id and public.student_in_class(h.class_name, h.school_id)
  );
$$;

create or replace function public.student_sees_share(p_school uuid, p_class text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.student_in_class(p_class, p_school);
$$;

-- Grup mesajı: öğrenci ana şubesinin ve onaylı gruplarının sınıf sohbetini okur
create or replace function public.can_read_conversation(p_conv text)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when public.is_admin() then true
    when public.is_staff() then
      (p_conv like 'ogr:%' and exists (
        select 1 from public.students s
        where s.id::text = split_part(p_conv, ':', 2) and s.school_id is not distinct from public.my_school_id()
      ))
      or (p_conv like 'sinif:%' and split_part(p_conv, ':', 2) = coalesce(public.my_school_id()::text, 'none'))
    else
      exists (
        select 1 from public.students me
        where me.id = public.current_student_id()
          and (
            p_conv = 'ogr:' || me.id::text
            or p_conv = public.class_conversation_id(me.school_id, me.class_name)
            or exists (
              select 1 from public.class_members m
              where m.student_id = me.id and m.status = 'approved'
                and p_conv = public.class_conversation_id(me.school_id, m.class_name)
            )
          )
      )
  end;
$$;

-- Okuma yarışması: grup üyeleri de ölçülebilir
create or replace function public.reading_results_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_finished timestamptz;
  v_contest uuid := case when tg_op = 'DELETE' then old.contest_id else new.contest_id end;
begin
  select c.finished_at into v_finished from public.reading_contests c where c.id = v_contest;

  if tg_op = 'DELETE' then
    if v_finished is not null and not old.late
       and exists (select 1 from public.reading_contests c where c.id = old.contest_id) then
      raise exception 'Yarışma bitti; o gün ölçülen sonuç silinemez.' using errcode = '42501';
    end if;
    return old;
  end if;

  if not exists (
    select 1 from public.reading_contests c
    where c.id = new.contest_id and public.student_is_member(new.student_id, c.class_name, c.school_id)
  ) then
    raise exception 'Öğrenci bu yarışmanın sınıfında değil.' using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    new.late := v_finished is not null;
  else
    if new.contest_id <> old.contest_id or new.student_id <> old.student_id then
      raise exception 'Sonuç başka yarışmaya/öğrenciye taşınamaz.' using errcode = '42501';
    end if;
    if v_finished is not null and not old.late then
      raise exception 'Yarışma bitti; o gün ölçülen sonuç değiştirilemez.' using errcode = '42501';
    end if;
    new.late := old.late;
  end if;
  new.measured_by := auth.uid();
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.reading_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (
    select s.id, s.class_name, s.school_id from public.students s
    where s.id = public.current_student_id()
  ),
  contests as (
    select c.id, c.seq, c.title, c.contest_date, c.finished_at,
           lag(c.id) over (partition by c.class_name order by c.seq) as prev_id
    from public.reading_contests c
    where public.student_in_class(c.class_name, c.school_id)
  ),
  ranked as (
    select r.contest_id, r.student_id, r.words, r.late,
           rank() over (partition by r.contest_id order by r.words desc) as rnk,
           case when not r.late then rank() over (partition by r.contest_id, r.late order by r.words desc) end as day_rnk
    from public.reading_results r
    where r.contest_id in (select id from contests)
  ),
  gains as (
    select c.id as contest_id, cur.student_id, cur.words - prev.words as gain,
           rank() over (partition by c.id order by cur.words - prev.words desc) as rnk
    from contests c
    join ranked cur on cur.contest_id = c.id
    join ranked prev on prev.contest_id = c.prev_id and prev.student_id = cur.student_id
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', c.id,
    'seq', c.seq,
    'title', c.title,
    'date', c.contest_date,
    'finished', c.finished_at is not null,
    'participants', (select count(*) from ranked r where r.contest_id = c.id),
    'class_avg', (select round(avg(r.words)) from ranked r where r.contest_id = c.id),
    'mine', (
      select jsonb_build_object(
        'words', r.words, 'rank', r.rnk, 'late', r.late,
        'medal', case when r.day_rnk <= 3 then r.day_rnk end,
        'gain', g.gain, 'gain_rank', g.rnk)
      from ranked r
      left join gains g on g.contest_id = r.contest_id and g.student_id = r.student_id
      where r.contest_id = c.id and r.student_id = (select id from me)
    ),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object(
        'name', s.name, 'words', r.words, 'rank', r.rnk, 'late', r.late,
        'medal', case when r.day_rnk <= 3 then r.day_rnk end,
        'me', s.id = (select id from me)) order by r.rnk, s.name)
      from ranked r join public.students s on s.id = r.student_id
      where r.contest_id = c.id and r.rnk <= 10
    ), '[]'::jsonb),
    'top_gain', coalesce((
      select jsonb_agg(jsonb_build_object('name', s.name, 'gain', g.gain, 'rank', g.rnk, 'me', s.id = (select id from me))
                       order by g.rnk, s.name)
      from gains g join public.students s on s.id = g.student_id
      where g.contest_id = c.id and g.rnk <= 10 and g.gain > 0
    ), '[]'::jsonb)
  ) order by c.seq desc), '[]'::jsonb)
  from contests c;
$$;

-- Quiz: süre dolunca grubun üyeleri de "katılmadı" sayılır; öğrencinin quiz listesi gruplarını da içerir
create or replace function public.quiz_settle(p_hw uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  h public.homeworks;
  r record;
begin
  select * into h from public.homeworks where id = p_hw for update;
  if not found or h.quiz_mode is null or h.quiz_settled_at is not null then return; end if;
  if public.quiz_is_open(h) then return; end if;
  if not (public.owns_homework(p_hw) or public.student_has_homework(p_hw)) then return; end if;

  for r in select student_id from public.quiz_attempts where homework_id = p_hw and finished_at is null loop
    update public.quiz_attempts set finished_at = coalesce(h.due_at, now()) where homework_id = p_hw and student_id = r.student_id;
    perform public.quiz_write_check(p_hw, r.student_id);
  end loop;

  insert into public.homework_checks (homework_id, student_id, status, score, note, checked_by)
  select p_hw, s.id, 'yapmadi', 0, 'Quiz: katılmadı', h.teacher_id
  from public.students s
  where s.school_id is not distinct from h.school_id
    and (s.class_name = h.class_name
         or exists (select 1 from public.class_members m where m.student_id = s.id and m.class_name = h.class_name and m.status = 'approved'))
    and not exists (select 1 from public.quiz_attempts a where a.homework_id = p_hw and a.student_id = s.id)
  on conflict (homework_id, student_id) do nothing;

  update public.homeworks
     set quiz_settled_at = now(),
         results_released = case when quiz_mode = 'exam' then true else results_released end
   where id = p_hw;
end;
$$;

create or replace function public.my_quizzes()
returns table (homework_id uuid, answered integer, total integer, finished boolean, percent integer)
language sql stable security definer set search_path = '' as $$
  select h.id,
         (select count(*)::integer from public.quiz_answers x where x.homework_id = h.id and x.student_id = public.current_student_id() and x.tries > 0),
         (select count(*)::integer from public.quiz_items i where i.homework_id = h.id),
         coalesce(a.finished_at is not null, false),
         case when h.quiz_mode = 'practice' or not public.quiz_is_open(h)
              then round(coalesce(a.score, 0) * 100 / greatest((select count(*) from public.quiz_items i where i.homework_id = h.id), 1))::integer end
  from public.homeworks h
  left join public.quiz_attempts a on a.homework_id = h.id and a.student_id = public.current_student_id()
  where h.quiz_mode is not null and public.student_in_class(h.class_name, h.school_id);
$$;

-- --------------------------------------------------------
-- 3) Okul yöneticisi: kurallar
-- --------------------------------------------------------
-- Okulundaki öğretmen profillerini görür
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or (select public.is_admin())
    or ((select public.is_school_admin()) and school_id = (select public.my_school_id()))
  );

-- Okulundaki öğretmenleri onaylar / pasife alır (kendisini ve başka okul yöneticilerini değil)
drop policy if exists profiles_school_admin_update on public.profiles;
create policy profiles_school_admin_update on public.profiles for update to authenticated
  using (
    (select public.is_school_admin()) and school_id = (select public.my_school_id())
    and role = 'ogretmen' and id <> (select auth.uid()) and not is_school_admin
  )
  with check ((select public.is_school_admin()) and school_id = (select public.my_school_id()) and role = 'ogretmen');

-- Okul yöneticisi yalnızca onay ve aktiflik değiştirebilir (ad, okul, rol vb. değil)
create or replace function public.profiles_school_admin_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if public.is_admin() or new.id = auth.uid() or auth.uid() is null then
    return new;
  end if;
  if new.role is distinct from old.role or new.full_name is distinct from old.full_name or new.email is distinct from old.email
     or new.branch is distinct from old.branch or new.city is distinct from old.city or new.district is distinct from old.district
     or new.school_id is distinct from old.school_id or new.school_name is distinct from old.school_name
     or new.class_name is distinct from old.class_name or new.is_school_admin is distinct from old.is_school_admin then
    raise exception 'Okul yöneticisi yalnızca onay ve aktiflik durumunu değiştirebilir.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function public.profiles_school_admin_guard() from public, anon, authenticated;
drop trigger if exists profiles_school_admin_guard on public.profiles;
create trigger profiles_school_admin_guard before update on public.profiles
  for each row execute function public.profiles_school_admin_guard();

-- Süper admin: okul yöneticisi yapar / kaldırır
create or replace function public.admin_set_school_admin(p_profile_id uuid, p_value boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501'; end if;
  update public.profiles set is_school_admin = p_value
   where id = p_profile_id and role = 'ogretmen' and (not p_value or school_id is not null);
  if not found then raise exception 'Öğretmen bulunamadı ya da bir okula bağlı değil.'; end if;
end;
$$;
revoke execute on function public.admin_set_school_admin(uuid, boolean) from public, anon;
grant execute on function public.admin_set_school_admin(uuid, boolean) to authenticated;

-- Öğretmen başvuru belgesini okulunun yöneticisi de görür
drop policy if exists teacher_documents_select on storage.objects;
create policy teacher_documents_select on storage.objects for select to authenticated
  using (
    bucket_id = 'teacher-documents'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.is_admin())
      or ((select public.is_school_admin()) and exists (
        select 1 from public.profiles p
        where p.id::text = (storage.foldername(name))[1] and p.school_id = (select public.my_school_id())
      ))
    )
  );

-- Okul yöneticisi okulunun öğrencilerini sınıf değiştirerek de düzenleyebilir
drop policy if exists students_staff_update on public.students;
create policy students_staff_update on public.students for update to authenticated
  using ((select public.staff_can_manage_student(id)))
  with check (
    (select public.is_admin())
    or (school_id is not distinct from (select public.my_school_id()) and (select public.teacher_has_class(class_name)))
  );

-- --------------------------------------------------------
-- 4) Kampüs (isteğe bağlı): okul → kampüs → sınıf
-- --------------------------------------------------------
create table if not exists public.school_campuses (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null default public.my_school_id() references public.schools(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  created_at timestamptz not null default now()
);
create unique index if not exists school_campuses_name_uidx on public.school_campuses (school_id, lower(btrim(name)));
alter table public.school_campuses enable row level security;

create table if not exists public.class_campuses (
  school_id uuid not null default public.my_school_id() references public.schools(id) on delete cascade,
  class_name text not null check (char_length(btrim(class_name)) between 1 and 20),
  campus_id uuid not null references public.school_campuses(id) on delete cascade,
  primary key (school_id, class_name)
);
alter table public.class_campuses enable row level security;

create or replace function public.can_manage_school(p_school uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or (public.is_school_admin() and p_school = public.my_school_id());
$$;
revoke execute on function public.can_manage_school(uuid) from public, anon;
grant execute on function public.can_manage_school(uuid) to authenticated;

drop policy if exists school_campuses_select on public.school_campuses;
create policy school_campuses_select on public.school_campuses for select to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and school_id = (select public.my_school_id())));
drop policy if exists school_campuses_write on public.school_campuses;
create policy school_campuses_write on public.school_campuses for all to authenticated
  using ((select public.can_manage_school(school_id))) with check ((select public.can_manage_school(school_id)));

drop policy if exists class_campuses_select on public.class_campuses;
create policy class_campuses_select on public.class_campuses for select to authenticated
  using ((select public.is_admin()) or ((select public.is_staff()) and school_id = (select public.my_school_id())));
drop policy if exists class_campuses_write on public.class_campuses;
create policy class_campuses_write on public.class_campuses for all to authenticated
  using ((select public.can_manage_school(school_id)))
  with check ((select public.can_manage_school(school_id)) and exists (select 1 from public.school_campuses c where c.id = campus_id and c.school_id = class_campuses.school_id));

revoke all on public.school_campuses, public.class_campuses from anon;
grant select, insert, update, delete on public.school_campuses, public.class_campuses to authenticated;

-- Okul yöneticisi: okulun bütün sınıfları (öğrenci sayısı, grup üyesi, öğretmenler, kampüs)
create or replace function public.school_classes_overview()
returns table (class_name text, student_count integer, member_count integer, teachers text[], campus_id uuid)
language sql stable security definer set search_path = '' as $$
  with sch as (select public.my_school_id() as id),
  cls as (
    select s.class_name from public.students s, sch where s.school_id = sch.id and coalesce(btrim(s.class_name), '') <> ''
    union select t.class_name from public.teacher_classes t join public.profiles p on p.id = t.teacher_id, sch where p.school_id = sch.id
    union select p.class_name from public.profiles p, sch where p.school_id = sch.id and coalesce(btrim(p.class_name), '') <> ''
    union select m.class_name from public.class_members m, sch where m.school_id = sch.id
  )
  select c.class_name,
         (select count(*)::integer from public.students s, sch where s.school_id = sch.id and s.class_name = c.class_name),
         (select count(*)::integer from public.class_members m, sch where m.school_id = sch.id and m.class_name = c.class_name and m.status = 'approved'),
         coalesce((select array_agg(distinct nullif(p.full_name, '')) from public.profiles p, sch
                   where p.school_id = sch.id and p.approved and p.is_active
                     and (p.class_name = c.class_name or exists (select 1 from public.teacher_classes t where t.teacher_id = p.id and t.class_name = c.class_name))), '{}'),
         (select cc.campus_id from public.class_campuses cc, sch where cc.school_id = sch.id and cc.class_name = c.class_name)
  from cls c
  where public.is_school_admin()
  order by c.class_name;
$$;
revoke execute on function public.school_classes_overview() from public, anon;
grant execute on function public.school_classes_overview() to authenticated;

-- --------------------------------------------------------
-- 5) Okul alanı: okul şablonları ve zümre klasörleri
-- --------------------------------------------------------
create table if not exists public.staff_shares (
  id uuid primary key default gen_random_uuid(),
  file_id uuid not null references public.teacher_files(id) on delete cascade,
  school_id uuid references public.schools(id),
  scope text not null check (scope in ('okul', 'zumre')),
  subject text check (subject is null or char_length(subject) <= 80),
  shared_by uuid default auth.uid() references auth.users(id) on delete set null,
  shared_by_name text not null default '',
  created_at timestamptz not null default now(),
  check ((scope = 'okul' and subject is null) or (scope = 'zumre' and subject is not null))
);
create unique index if not exists staff_shares_uidx on public.staff_shares (file_id, scope, coalesce(subject, ''));
create index if not exists staff_shares_school_idx on public.staff_shares (school_id, scope, subject);
alter table public.staff_shares enable row level security;

create or replace function public.staff_shares_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_staff() or public.my_school_id() is null then
    raise exception 'Okul alanına yalnızca bir okula bağlı öğretmenler ekleyebilir.';
  end if;
  if not exists (select 1 from public.teacher_files f where f.id = new.file_id and f.teacher_id = auth.uid()) then
    raise exception 'Yalnızca kendi dosyanızı paylaşabilirsiniz.';
  end if;
  new.school_id := public.my_school_id();
  new.shared_by := auth.uid();
  new.subject := nullif(btrim(coalesce(new.subject, '')), '');
  select coalesce(nullif(btrim(p.full_name), ''), 'Öğretmen') into new.shared_by_name from public.profiles p where p.id = auth.uid();
  new.created_at := now();
  return new;
end;
$$;
revoke execute on function public.staff_shares_guard() from public, anon, authenticated;
drop trigger if exists staff_shares_guard on public.staff_shares;
create trigger staff_shares_guard before insert on public.staff_shares
  for each row execute function public.staff_shares_guard();

drop policy if exists staff_shares_select on public.staff_shares;
create policy staff_shares_select on public.staff_shares for select to authenticated
  using ((select public.is_staff()) and school_id = (select public.my_school_id()));
drop policy if exists staff_shares_insert on public.staff_shares;
create policy staff_shares_insert on public.staff_shares for insert to authenticated
  with check ((select public.is_staff()));
drop policy if exists staff_shares_delete on public.staff_shares;
create policy staff_shares_delete on public.staff_shares for delete to authenticated
  using (shared_by = (select auth.uid()) or ((select public.is_school_admin()) and school_id = (select public.my_school_id())));
revoke all on public.staff_shares from anon;
grant select, insert, delete on public.staff_shares to authenticated;

create or replace function public.staff_can_see_file(p_file uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() and exists (
    select 1 from public.staff_shares s where s.file_id = p_file and s.school_id = public.my_school_id()
  );
$$;
revoke execute on function public.staff_can_see_file(uuid) from public, anon;
grant execute on function public.staff_can_see_file(uuid) to authenticated;

create or replace function public.staff_can_read_teacher_path(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.teacher_files f where f.path = p_path and public.staff_can_see_file(f.id));
$$;
revoke execute on function public.staff_can_read_teacher_path(text) from public, anon;
grant execute on function public.staff_can_read_teacher_path(text) to authenticated;

drop policy if exists teacher_files_select on public.teacher_files;
create policy teacher_files_select on public.teacher_files for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or (select public.student_can_see_file(id))
    or (select public.staff_can_see_file(id))
  );

drop policy if exists teacher_files_obj_select on storage.objects;
create policy teacher_files_obj_select on storage.objects for select to authenticated
  using (
    bucket_id = 'teacher-files'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or (select public.student_can_read_teacher_path(name))
      or (select public.staff_can_read_teacher_path(name))
    )
  );

-- --------------------------------------------------------
-- 6) Sınıf grubu mesajında kişi başına "okundu"
-- --------------------------------------------------------
create table if not exists public.conversation_reads (
  conversation_id text not null,
  student_id uuid not null references public.students(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, student_id)
);
alter table public.conversation_reads enable row level security;
revoke all on public.conversation_reads from anon, authenticated;

-- Öğrenci: grup sohbetini açınca "okudum" kaydı
create or replace function public.mark_group_read(p_conv text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
begin
  if v_student is null or p_conv not like 'sinif:%' or not public.can_read_conversation(p_conv) then return; end if;
  insert into public.conversation_reads (conversation_id, student_id, last_read_at)
  values (p_conv, v_student, now())
  on conflict (conversation_id, student_id) do update set last_read_at = now();
end;
$$;
revoke execute on function public.mark_group_read(text) from public, anon;
grant execute on function public.mark_group_read(text) to authenticated;

-- Öğretmen: grup sohbetini kim, en son ne zaman okudu
create or replace function public.group_read_receipts(p_conv text)
returns table (student_id uuid, name text, last_read_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.student_id, s.name, r.last_read_at
  from public.conversation_reads r
  join public.students s on s.id = r.student_id
  where public.is_staff() and p_conv like 'sinif:%' and public.can_read_conversation(p_conv) and r.conversation_id = p_conv;
$$;
revoke execute on function public.group_read_receipts(text) from public, anon;
grant execute on function public.group_read_receipts(text) to authenticated;
