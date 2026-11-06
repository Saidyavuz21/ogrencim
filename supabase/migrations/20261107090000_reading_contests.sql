-- ========================================================
-- OKUMA YARIŞMASI (okuma hızı: 1 dakikada okunan kelime)
--  - Öğretmen "Okuma yarışması oluştur"a basar: tarih bugün, sıra ve ad otomatik
--    (sınıf başına 1., 2., 3. … "N. Okuma Yarışması")
--  - Metin uygulamada yok; öğretmen kendi kitabından okutur
--  - Öğrenci başına tek ölçüm: okunan kelime sayısı
--  - "Bitir" deyince o günün sıralaması kesinleşir (finished_at):
--    * O gün ölçülenlerin sonucu artık değiştirilemez/silinemez
--    * O gün ölçülmeyenler sonradan eklenebilir: late = true ("sonradan" etiketi),
--      sıralamaya girerler ama o günün madalyaları (ilk 3) değişmez
--  - Öğretmen kendi yarışmalarının tüm sonuçlarını görür; öğrenci yalnızca kendi satırını.
--    Öğrencinin sıralama (ilk 10 + kendi yeri) ve gelişim özeti reading_overview() ile gelir.
-- ========================================================

create table if not exists public.reading_contests (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  teacher_id uuid references public.profiles(id) on delete set null,
  class_name text not null,
  seq integer not null default 0,
  title text not null default '',
  contest_date date not null default current_date,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index if not exists reading_contests_seq_uq on public.reading_contests (school_id, class_name, seq);
alter table public.reading_contests enable row level security;
revoke all on public.reading_contests from anon;
grant select, insert, update, delete on public.reading_contests to authenticated;

-- Sahip, okul, sıra, ad ve tarih sunucuda atanır; sonradan yalnızca finished_at değişir
create or replace function public.reading_contests_set_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
    new.contest_date := (now() at time zone 'Europe/Istanbul')::date;
    new.created_at := now();
    new.finished_at := null;
    -- Aynı anda iki oluşturma çakışmasın: sınıf için kısa kilit
    perform pg_advisory_xact_lock(hashtext(coalesce(new.school_id::text, 'none') || '/' || new.class_name));
    select coalesce(max(c.seq), 0) + 1 into new.seq
      from public.reading_contests c
     where c.school_id is not distinct from new.school_id and c.class_name = new.class_name;
    new.title := new.seq || '. Okuma Yarışması';
  else
    new.teacher_id := old.teacher_id;
    new.school_id := old.school_id;
    new.class_name := old.class_name;
    new.seq := old.seq;
    new.title := old.title;
    new.contest_date := old.contest_date;
    new.created_at := old.created_at;
  end if;
  return new;
end;
$$;
revoke execute on function public.reading_contests_set_owner() from public, anon, authenticated;
drop trigger if exists reading_contests_set_owner on public.reading_contests;
create trigger reading_contests_set_owner before insert or update on public.reading_contests
  for each row execute function public.reading_contests_set_owner();

drop policy if exists reading_contests_select on public.reading_contests;
create policy reading_contests_select on public.reading_contests for select to authenticated
  using (
    (select public.is_admin())
    or ((select public.is_staff()) and school_id is not distinct from (select public.my_school_id()))
    or exists (
      select 1 from public.students me
      where me.id = (select public.current_student_id())
        and me.class_name = reading_contests.class_name
        and me.school_id is not distinct from reading_contests.school_id
    )
  );
drop policy if exists reading_contests_insert on public.reading_contests;
create policy reading_contests_insert on public.reading_contests for insert to authenticated
  with check ((select public.is_staff()) and (select public.teacher_has_class(class_name)));
drop policy if exists reading_contests_update on public.reading_contests;
create policy reading_contests_update on public.reading_contests for update to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_admin()))
  with check (teacher_id = (select auth.uid()) or (select public.is_admin()));
drop policy if exists reading_contests_delete on public.reading_contests;
create policy reading_contests_delete on public.reading_contests for delete to authenticated
  using (teacher_id = (select auth.uid()) or (select public.is_admin()));

-- Yarışmanın sahibi öğretmen (ya da admin) mi?
create or replace function public.owns_reading_contest(p_contest_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.is_admin() or exists (
    select 1 from public.reading_contests c
    where c.id = p_contest_id and c.teacher_id = auth.uid() and public.is_staff()
  );
$$;
revoke execute on function public.owns_reading_contest(uuid) from public, anon;
grant execute on function public.owns_reading_contest(uuid) to authenticated;

-- --------------------------------------------------------
-- SONUÇLAR
-- --------------------------------------------------------
create table if not exists public.reading_results (
  contest_id uuid not null references public.reading_contests(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  words integer not null check (words between 0 and 1000),
  late boolean not null default false,
  measured_by uuid default auth.uid() references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (contest_id, student_id)
);
create index if not exists reading_results_student_idx on public.reading_results (student_id);
alter table public.reading_results enable row level security;
revoke all on public.reading_results from anon;
grant select, insert, update, delete on public.reading_results to authenticated;

-- Sınıf denetimi + kesinleşme kilidi; "sonradan" etiketi sunucuda atanır
create or replace function public.reading_results_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_finished timestamptz;
  v_contest uuid := case when tg_op = 'DELETE' then old.contest_id else new.contest_id end;
begin
  select c.finished_at into v_finished from public.reading_contests c where c.id = v_contest;

  if tg_op = 'DELETE' then
    -- Yarışma silinirken (cascade) kayıt bulunmaz; serbest
    if v_finished is not null and not old.late
       and exists (select 1 from public.reading_contests c where c.id = old.contest_id) then
      raise exception 'Yarışma bitti; o gün ölçülen sonuç silinemez.' using errcode = '42501';
    end if;
    return old;
  end if;

  if not exists (
    select 1
    from public.reading_contests c
    join public.students s on s.id = new.student_id
    where c.id = new.contest_id
      and s.class_name = c.class_name
      and s.school_id is not distinct from c.school_id
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
revoke execute on function public.reading_results_guard() from public, anon, authenticated;
drop trigger if exists reading_results_guard on public.reading_results;
create trigger reading_results_guard before insert or update or delete on public.reading_results
  for each row execute function public.reading_results_guard();

drop policy if exists reading_results_select on public.reading_results;
create policy reading_results_select on public.reading_results for select to authenticated
  using ((select public.owns_reading_contest(contest_id)) or student_id = (select public.current_student_id()));
drop policy if exists reading_results_write on public.reading_results;
create policy reading_results_write on public.reading_results for all to authenticated
  using ((select public.owns_reading_contest(contest_id)) and (select public.staff_can_see_student(student_id)))
  with check ((select public.owns_reading_contest(contest_id)) and (select public.staff_can_see_student(student_id)));

-- --------------------------------------------------------
-- ÖĞRENCİ ÖZETİ (her yarışma: kendi sonucu ve sırası, ilk 10, sınıf ortalaması,
-- bir önceki yarışmaya göre gelişim ve "en çok gelişenler" ilk 10)
--  - Sıra: herkes (sonradan eklenenler dahil) kelime sayısına göre
--  - Madalya: yalnızca o gün ölçülenler arasında ilk 3 (sonradan eklenen madalya almaz)
--  - Önceki yarışma: aynı sınıfın bir önceki sıra numaralı yarışması
-- --------------------------------------------------------
create or replace function public.reading_overview()
returns jsonb language sql stable security definer set search_path = '' as $$
  with me as (
    select s.id, s.class_name, s.school_id from public.students s
    where s.id = public.current_student_id()
  ),
  contests as (
    select c.id, c.seq, c.title, c.contest_date, c.finished_at,
           lag(c.id) over (order by c.seq) as prev_id
    from public.reading_contests c, me
    where c.class_name = me.class_name and c.school_id is not distinct from me.school_id
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
revoke execute on function public.reading_overview() from public, anon;
grant execute on function public.reading_overview() to authenticated;
