-- ========================================================
-- ÖĞRENCİ BAHÇESİ
-- - Her sınıfın davranış türleri vardır (Ödev, Saygı, Katılım, …); öğretmen yenisini ekler, kullanmadığını arşivler.
--   Davranış türleri silinmez, yalnızca arşivlenir (dikilmiş ağaçların adı kaybolmasın).
-- - Öğretmen bir davranış için +1 verir: öğrencinin toplam puanı da 1 artar (akvaryum, sıralama aynen çalışır).
--   O davranıştaki ilk puan fidanı diker; sonraki her puan 1 sulama hakkıdır.
-- - Öğrenci kendi panelinden sular; ağaç sulandıkça büyür (aşama istemcide "watered" sayısından hesaplanır).
-- - Bahçede eksi puan yoktur; ağaç hiç küçülmez. Geri alma yalnızca öğretmenin kendi son 10 dakikadaki
--   puanı içindir ve öğrenci o hakkı kullanmışsa (sulamışsa) yapılamaz.
-- - Bütün yazma işleri güvenlik tanımlı fonksiyonlarla; tablolara doğrudan erişim yok.
-- - Öğrenci silme / KVKK dışa aktarma / geri alma: garden_trees öğrenci kopyasına eklendi.
-- ========================================================

-- --------------------------------------------------------
-- 1) Tablolar
-- --------------------------------------------------------
create table if not exists public.garden_behaviors (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  class_name text not null check (char_length(btrim(class_name)) between 1 and 20),
  name text not null check (char_length(btrim(name)) between 1 and 30),
  icon text not null default 'star' check (icon ~ '^[a-z0-9_-]{1,24}$'),
  tree text not null default 'oak' check (tree ~ '^[a-z0-9_-]{1,24}$'),
  sort integer not null default 0,
  archived boolean not null default false,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists garden_behaviors_class_idx on public.garden_behaviors (school_id, class_name);
-- Aynı sınıfta aynı adlı iki etkin davranış olmasın
create unique index if not exists garden_behaviors_name_uq
  on public.garden_behaviors (coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), class_name, lower(btrim(name)))
  where not archived;

create table if not exists public.garden_trees (
  student_id uuid not null references public.students(id) on delete cascade,
  behavior_id uuid not null references public.garden_behaviors(id) on delete cascade,
  earned integer not null default 0 check (earned >= 0),
  watered integer not null default 0 check (watered >= 0),
  planted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (student_id, behavior_id),
  -- İlk puan fidanı diker; sulama hakkı = earned - 1 - watered
  constraint garden_trees_water_check check (watered <= greatest(earned - 1, 0))
);
create index if not exists garden_trees_behavior_idx on public.garden_trees (behavior_id);

alter table public.garden_behaviors enable row level security;
alter table public.garden_trees enable row level security;
revoke all on public.garden_behaviors from anon, authenticated;
revoke all on public.garden_trees from anon, authenticated;

-- Puan geçmişi: bahçe puanı hangi davranış için, kim verdi (geri alma için)
alter table public.points_history add column if not exists garden_behavior_id uuid;
alter table public.points_history add column if not exists created_by uuid default auth.uid();
create index if not exists points_history_garden_idx on public.points_history (created_by, created_at)
  where garden_behavior_id is not null;

-- --------------------------------------------------------
-- 2) Yardımcılar
-- --------------------------------------------------------
-- Öğretmen bu sınıfı yönetebilir mi? (kendi okulundaki sınıf)
create or replace function private.garden_class_ok(p_class text)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_staff() and char_length(btrim(coalesce(p_class, ''))) between 1 and 20;
$$;
revoke all on function private.garden_class_ok(text) from public, anon, authenticated;

-- Davranış satırı JSON
create or replace function private.garden_behavior_json(b public.garden_behaviors)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('id', b.id, 'name', b.name, 'icon', b.icon, 'tree', b.tree, 'sort', b.sort, 'archived', b.archived);
$$;
revoke all on function private.garden_behavior_json(public.garden_behaviors) from public, anon;

-- Sınıfta hiç davranış yoksa varsayılanları ekler
create or replace function private.garden_seed(p_school uuid, p_class text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('garden_seed:' || coalesce(p_school::text, '-') || ':' || p_class));
  if exists (select 1 from public.garden_behaviors where school_id is not distinct from p_school and class_name = p_class) then
    return;
  end if;
  insert into public.garden_behaviors (school_id, class_name, name, icon, tree, sort) values
    (p_school, p_class, 'Ödev', 'book', 'apple', 1),
    (p_school, p_class, 'Saygı', 'heart', 'cherry', 2),
    (p_school, p_class, 'Derse katılım', 'hand', 'oak', 3),
    (p_school, p_class, 'Temizlik', 'sparkles', 'pine', 4),
    (p_school, p_class, 'Yardımlaşma', 'handshake', 'orange', 5),
    (p_school, p_class, 'Düzen', 'check', 'olive', 6);
end;
$$;
revoke all on function private.garden_seed(uuid, text) from public, anon, authenticated;

-- --------------------------------------------------------
-- 3) Öğretmen: davranış türleri
-- --------------------------------------------------------
-- Sınıfın davranışları (yoksa varsayılanlar eklenir). Arşivlenenler de döner (archived = true).
create or replace function public.staff_garden_behaviors(p_class text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid := public.my_school_id();
  v_class text := btrim(p_class);
begin
  if not private.garden_class_ok(v_class) then
    raise exception 'Bu sınıfın bahçesini göremezsiniz.' using errcode = '42501';
  end if;
  -- Varsayılanlar yalnızca gerçekten öğrencisi olan sınıfa eklenir
  if exists (select 1 from public.class_roster(v_class)) then
    perform private.garden_seed(v_school, v_class);
  end if;
  return coalesce((
    select jsonb_agg(private.garden_behavior_json(b) order by b.archived, b.sort, b.created_at)
    from public.garden_behaviors b
    where b.school_id is not distinct from v_school and b.class_name = v_class
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.staff_garden_behaviors(text) from public, anon;
grant execute on function public.staff_garden_behaviors(text) to authenticated;

-- Davranış ekle (p_id null) ya da düzenle. Sınıfta en fazla 12 etkin davranış.
create or replace function public.staff_garden_behavior_save(p_id uuid, p_class text, p_name text, p_icon text, p_tree text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid := public.my_school_id();
  v_class text := btrim(p_class);
  v_name text := btrim(coalesce(p_name, ''));
  b public.garden_behaviors;
begin
  if not private.garden_class_ok(v_class) then
    raise exception 'Bu sınıfın bahçesini düzenleyemezsiniz.' using errcode = '42501';
  end if;
  if char_length(v_name) not between 1 and 30 then
    raise exception 'Davranış adı 1–30 karakter olmalıdır.';
  end if;
  perform private.check_rate('garden_behavior_save', 60, 3600);
  if p_id is null then
    if (select count(*) from public.garden_behaviors
        where school_id is not distinct from v_school and class_name = v_class and not archived) >= 12 then
      raise exception 'Bir sınıfta en fazla 12 davranış olabilir. Kullanmadığınızı arşivleyin.';
    end if;
    insert into public.garden_behaviors (school_id, class_name, name, icon, tree, sort)
    values (v_school, v_class, v_name, coalesce(nullif(p_icon, ''), 'star'), coalesce(nullif(p_tree, ''), 'oak'),
            coalesce((select max(sort) + 1 from public.garden_behaviors where school_id is not distinct from v_school and class_name = v_class), 1))
    returning * into b;
  else
    update public.garden_behaviors
       set name = v_name,
           icon = coalesce(nullif(p_icon, ''), icon),
           tree = coalesce(nullif(p_tree, ''), tree)
     where id = p_id and school_id is not distinct from v_school and class_name = v_class
    returning * into b;
    if b.id is null then
      raise exception 'Davranış bulunamadı.';
    end if;
  end if;
  return private.garden_behavior_json(b);
exception when unique_violation then
  raise exception 'Bu sınıfta "%" adlı bir davranış zaten var.', v_name;
end;
$$;
revoke all on function public.staff_garden_behavior_save(uuid, text, text, text, text) from public, anon;
grant execute on function public.staff_garden_behavior_save(uuid, text, text, text, text) to authenticated;

-- Arşivle / arşivden çıkar (silme yok: dikilmiş ağaçlar adını korur)
create or replace function public.staff_garden_behavior_archive(p_id uuid, p_archived boolean)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_school uuid := public.my_school_id();
  b public.garden_behaviors;
begin
  if not public.is_staff() then
    raise exception 'Yetkiniz yok.' using errcode = '42501';
  end if;
  if not p_archived then
    select * into b from public.garden_behaviors where id = p_id and school_id is not distinct from v_school;
    if b.id is not null and (select count(*) from public.garden_behaviors
        where school_id is not distinct from v_school and class_name = b.class_name and not archived) >= 12 then
      raise exception 'Bir sınıfta en fazla 12 etkin davranış olabilir.';
    end if;
  end if;
  update public.garden_behaviors set archived = coalesce(p_archived, true)
   where id = p_id and school_id is not distinct from v_school
  returning * into b;
  if b.id is null then
    raise exception 'Davranış bulunamadı.';
  end if;
  return private.garden_behavior_json(b);
exception when unique_violation then
  raise exception 'Bu sınıfta aynı adlı etkin bir davranış var; önce onun adını değiştirin.';
end;
$$;
revoke all on function public.staff_garden_behavior_archive(uuid, boolean) from public, anon;
grant execute on function public.staff_garden_behavior_archive(uuid, boolean) to authenticated;

-- --------------------------------------------------------
-- 4) Öğretmen: sınıfın bahçeleri ve puan verme
-- --------------------------------------------------------
-- Sınıf listesi (ana şube + onaylı grup üyeleri) ve her öğrencinin ağaçları
create or replace function public.staff_garden_class(p_class text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_class text := btrim(p_class);
begin
  if not private.garden_class_ok(v_class) then
    raise exception 'Bu sınıfın bahçesini göremezsiniz.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', r.id, 'name', r.name, 'student_number', r.student_number, 'class_name', r.class_name,
      'points', r.points, 'is_member', r.is_member,
      'trees', coalesce((
        select jsonb_agg(jsonb_build_object('behavior_id', t.behavior_id, 'earned', t.earned, 'watered', t.watered,
                                            'planted_at', t.planted_at, 'updated_at', t.updated_at) order by t.planted_at)
        from public.garden_trees t where t.student_id = r.id
      ), '[]'::jsonb)
    ) order by r.is_member, r.student_number)
    from public.class_roster(v_class) r
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.staff_garden_class(text) from public, anon;
grant execute on function public.staff_garden_class(text) to authenticated;

-- Tek öğrenciye +1 (iç işlev; yetki kontrolünü çağıran yapar)
create or replace function private.garden_award_one(p_student uuid, b public.garden_behaviors, p_teacher text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_points integer;
  v_hist uuid;
  t public.garden_trees;
begin
  update public.students
     set points = coalesce(points, 0) + 1,
         plus_count = coalesce(plus_count, 0) + 1
   where id = p_student
  returning points into v_points;

  insert into public.points_history (student_id, teacher_name, change_type, amount, reason, garden_behavior_id, created_by)
  values (p_student, p_teacher, 'plus', 1, left(b.name, 200), b.id, auth.uid())
  returning id into v_hist;

  insert into public.garden_trees as g (student_id, behavior_id, earned)
  values (p_student, b.id, 1)
  on conflict (student_id, behavior_id) do update set earned = g.earned + 1, updated_at = now()
  returning * into t;

  return jsonb_build_object('history_id', v_hist, 'student_id', p_student, 'points', v_points,
                            'behavior_id', b.id, 'earned', t.earned, 'watered', t.watered);
end;
$$;
revoke all on function private.garden_award_one(uuid, public.garden_behaviors, text) from public, anon, authenticated;

-- Davranış bu öğrencinin sınıfına (ana şube ya da onaylı grup) ait mi?
create or replace function private.garden_behavior_for_student(p_student uuid, p_behavior uuid)
returns public.garden_behaviors language sql stable security definer set search_path = '' as $$
  select b.* from public.garden_behaviors b
  join public.students s on s.id = p_student
  where b.id = p_behavior and not b.archived
    and b.school_id is not distinct from s.school_id
    and (b.class_name = s.class_name
         or exists (select 1 from public.class_members m
                    where m.student_id = s.id and m.class_name = b.class_name and m.status = 'approved'));
$$;
revoke all on function private.garden_behavior_for_student(uuid, uuid) from public, anon, authenticated;

create or replace function public.staff_garden_award(p_student uuid, p_behavior uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  b public.garden_behaviors;
  v_teacher text;
begin
  if not public.staff_can_see_student(p_student) then
    raise exception 'Bu öğrenciye puan veremezsiniz.' using errcode = '42501';
  end if;
  b := private.garden_behavior_for_student(p_student, p_behavior);
  if b.id is null then
    raise exception 'Bu davranış öğrencinin sınıfında yok ya da arşivlenmiş.';
  end if;
  perform private.check_rate('garden_award', 600, 600);
  select coalesce(nullif(full_name, ''), 'Öğretmen') into v_teacher from public.profiles where id = auth.uid();
  return private.garden_award_one(p_student, b, v_teacher);
end;
$$;
revoke all on function public.staff_garden_award(uuid, uuid) from public, anon;
grant execute on function public.staff_garden_award(uuid, uuid) to authenticated;

-- Sınıftaki herkese +1 (ana şube + onaylı grup üyeleri). Dönen: verilen puanların listesi.
create or replace function public.staff_garden_award_class(p_class text, p_behavior uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_class text := btrim(p_class);
  v_school uuid := public.my_school_id();
  b public.garden_behaviors;
  v_teacher text;
  r record;
  v_out jsonb := '[]'::jsonb;
begin
  if not private.garden_class_ok(v_class) then
    raise exception 'Bu sınıfa puan veremezsiniz.' using errcode = '42501';
  end if;
  select * into b from public.garden_behaviors
   where id = p_behavior and not archived and school_id is not distinct from v_school and class_name = v_class;
  if b.id is null then
    raise exception 'Bu davranış bu sınıfta yok ya da arşivlenmiş.';
  end if;
  perform private.check_rate('garden_award_class', 60, 600);
  select coalesce(nullif(full_name, ''), 'Öğretmen') into v_teacher from public.profiles where id = auth.uid();
  for r in select id from public.class_roster(v_class) loop
    v_out := v_out || private.garden_award_one(r.id, b, v_teacher);
  end loop;
  return v_out;
end;
$$;
revoke all on function public.staff_garden_award_class(text, uuid) from public, anon;
grant execute on function public.staff_garden_award_class(text, uuid) to authenticated;

-- Geri al: yalnızca kendi verdiğin, son 10 dakikadaki bahçe puanı; öğrenci o hakkı sulamada kullandıysa olmaz
create or replace function public.staff_garden_undo(p_history uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  h public.points_history;
  t public.garden_trees;
  v_points integer;
  v_removed boolean := false;
begin
  select * into h from public.points_history
   where id = p_history and garden_behavior_id is not null and created_by = auth.uid()
     and created_at > now() - interval '10 minutes'
   for update;
  if h.id is null then
    raise exception 'Bu puan artık geri alınamaz (yalnızca son 10 dakikada verdiğiniz puanlar).';
  end if;
  if not public.staff_can_see_student(h.student_id) then
    raise exception 'Bu öğrenciye erişiminiz yok.' using errcode = '42501';
  end if;
  select * into t from public.garden_trees
   where student_id = h.student_id and behavior_id = h.garden_behavior_id for update;
  if t.student_id is not null then
    if t.watered > greatest(t.earned - 2, 0) then
      raise exception 'Öğrenci bu puanla ağacını suladı; geri alınamaz.';
    end if;
    if t.earned <= 1 then
      delete from public.garden_trees where student_id = t.student_id and behavior_id = t.behavior_id;
      v_removed := true;
    else
      update public.garden_trees set earned = earned - 1, updated_at = now()
       where student_id = t.student_id and behavior_id = t.behavior_id
      returning * into t;
    end if;
  end if;
  update public.students
     set points = coalesce(points, 0) - h.amount,
         plus_count = greatest(coalesce(plus_count, 0) - 1, 0)
   where id = h.student_id
  returning points into v_points;
  delete from public.points_history where id = h.id;
  return jsonb_build_object('student_id', h.student_id, 'points', v_points, 'behavior_id', h.garden_behavior_id,
                            'earned', case when v_removed then 0 else coalesce(t.earned, 0) end,
                            'watered', case when v_removed then 0 else coalesce(t.watered, 0) end);
end;
$$;
revoke all on function public.staff_garden_undo(uuid) from public, anon;
grant execute on function public.staff_garden_undo(uuid) to authenticated;

-- --------------------------------------------------------
-- 5) Öğrenci: kendi bahçesi ve sulama
-- --------------------------------------------------------
-- Ağaçları + ağaçlarının davranışları + sınıfının etkin davranışları (henüz dikilmemiş boş yerler için)
create or replace function public.student_garden()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := public.current_student_id();
  s public.students;
begin
  if v_id is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
  select * into s from public.students where id = v_id;
  return jsonb_build_object(
    'trees', coalesce((
      select jsonb_agg(jsonb_build_object('behavior_id', t.behavior_id, 'earned', t.earned, 'watered', t.watered,
                                          'planted_at', t.planted_at, 'updated_at', t.updated_at) order by t.planted_at)
      from public.garden_trees t where t.student_id = v_id
    ), '[]'::jsonb),
    'behaviors', coalesce((
      select jsonb_agg(private.garden_behavior_json(b) order by b.archived, b.sort, b.created_at)
      from public.garden_behaviors b
      where b.id in (select behavior_id from public.garden_trees where student_id = v_id)
         or (not b.archived and b.school_id is not distinct from s.school_id and b.class_name = s.class_name)
    ), '[]'::jsonb)
  );
end;
$$;
revoke all on function public.student_garden() from public, anon;
grant execute on function public.student_garden() to authenticated;

create or replace function public.student_garden_water(p_behavior uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := public.current_student_id();
  t public.garden_trees;
begin
  if v_id is null then
    raise exception 'Oturum bulunamadı.' using errcode = '42501';
  end if;
  update public.garden_trees
     set watered = watered + 1, updated_at = now()
   where student_id = v_id and behavior_id = p_behavior and watered < earned - 1
  returning * into t;
  if t.student_id is null then
    raise exception 'Bu ağaç için sulama hakkın yok. Bu davranışı göstermeye devam et!';
  end if;
  return jsonb_build_object('behavior_id', t.behavior_id, 'earned', t.earned, 'watered', t.watered,
                            'planted_at', t.planted_at, 'updated_at', t.updated_at);
end;
$$;
revoke all on function public.student_garden_water(uuid) from public, anon;
grant execute on function public.student_garden_water(uuid) to authenticated;

-- --------------------------------------------------------
-- 6) Öğrenci kopyası (silme, KVKK dışa aktarma) ve geri alma: garden_trees eklendi
-- --------------------------------------------------------
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
    'garden_trees',         (select jsonb_agg(to_jsonb(t)) from public.garden_trees t where t.student_id = p_student_id),
    'messages',             (select jsonb_agg(to_jsonb(t) order by t.created_at) from public.messages t
                              where t.conversation_id in ('ogr:' || p_student_id::text, 'soru:' || p_student_id::text))
  );
$$;
revoke all on function private.student_snapshot(uuid) from public, anon, authenticated;

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
    'quiz_attempts', 'quiz_answers', 'reading_results', 'class_members', 'conversation_reads', 'board_drawings', 'messages',
    'garden_trees'
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

  -- Boş tablolar kopyada null olarak durur (jsonb_agg satır yoksa null döner); boş listeye çevir.
  -- Eski kopyalarda olmayan anahtarlar (ör. garden_trees) da boş liste olur.
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
  insert into public.garden_trees
    select r.* from jsonb_populate_recordset(null::public.garden_trees, coalesce(v -> 'garden_trees', '[]'::jsonb)) r
    where exists (select 1 from public.garden_behaviors b where b.id = r.behavior_id);

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
