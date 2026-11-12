-- ========================================================
-- BİLGİ YARIŞMASI (sınıfta tek ekranda oynanan takımlı yarışma)
-- - quiz_shows: öğretmenin yarışması. Takımlar, ayarlar, soruların dondurulmuş kopyası ve cevap kaydı
--   state alanında tutulur (en fazla 512 KB). Sorular soru bankasından kopyalanır; bankadaki
--   değişiklik ya da silme kayıtlı yarışmayı bozmaz.
-- - Yalnızca sahibi olan öğretmen görür ve değiştirir. Öğrenciler bu tabloya erişemez
--   (yarışma öğretmenin ekranında oynanır, doğru cevaplar öğrenci cihazına gitmez).
-- - quiz_show_award: biten yarışmada kazanan takımın öğrencilerine davranış puanı verir.
--   Bir yarışma için yalnızca bir kez çalışır; puan olağan staff_give_points kurallarından geçer.
-- ========================================================

create table if not exists public.quiz_shows (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  class_name text check (class_name is null or char_length(class_name) <= 60),
  mode text not null default 'score' check (mode in ('score', 'questions')),
  status text not null default 'playing' check (status in ('playing', 'finished')),
  state jsonb not null default '{"teams": []}'::jsonb check (octet_length(state::text) <= 524288),
  awarded_at timestamptz,
  awarded_points smallint check (awarded_points is null or awarded_points between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quiz_shows_teacher_idx on public.quiz_shows (teacher_id, updated_at desc);
alter table public.quiz_shows enable row level security;

create or replace function public.quiz_shows_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_teams integer;
begin
  if tg_op = 'INSERT' then
    if not public.is_staff() then raise exception 'Yalnızca öğretmenler yarışma oluşturabilir.'; end if;
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
    new.created_at := now();
    new.awarded_at := null;
    new.awarded_points := null;
  else
    if new.teacher_id is distinct from old.teacher_id or new.school_id is distinct from old.school_id
       or new.mode is distinct from old.mode then
      raise exception 'Bu alan değiştirilemez.';
    end if;
    -- Davranış puanı kaydı yalnızca quiz_show_award içinden yazılır
    if coalesce(current_setting('app.quiz_show_award', true), '') <> '1' then
      new.awarded_at := old.awarded_at;
      new.awarded_points := old.awarded_points;
    end if;
  end if;
  new.title := btrim(new.title);
  new.class_name := nullif(btrim(coalesce(new.class_name, '')), '');
  if jsonb_typeof(new.state -> 'teams') is distinct from 'array' then
    raise exception 'Yarışma içeriği geçersiz.';
  end if;
  v_teams := jsonb_array_length(new.state -> 'teams');
  if v_teams < 2 or v_teams > 6 then
    raise exception 'Bir yarışmada 2–6 takım olmalı.';
  end if;
  if new.state ? 'questions' then
    if jsonb_typeof(new.state -> 'questions') is distinct from 'array' then
      raise exception 'Yarışma içeriği geçersiz.';
    end if;
    if jsonb_array_length(new.state -> 'questions') > 50 then
      raise exception 'Bir yarışmada en fazla 50 soru olabilir.';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.quiz_shows_guard() from public, anon, authenticated;
drop trigger if exists quiz_shows_guard on public.quiz_shows;
create trigger quiz_shows_guard before insert or update on public.quiz_shows
  for each row execute function public.quiz_shows_guard();

drop policy if exists quiz_shows_own on public.quiz_shows;
create policy quiz_shows_own on public.quiz_shows for all to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()))
  with check (teacher_id = (select auth.uid()) and (select public.is_staff()));
revoke all on public.quiz_shows from anon;
grant select, insert, update, delete on public.quiz_shows to authenticated;

-- --------------------------------------------------------
-- Kazanan takıma davranış puanı (yarışma başına bir kez)
-- --------------------------------------------------------
create or replace function public.quiz_show_award(p_show uuid, p_student_ids uuid[], p_points integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_show public.quiz_shows;
  v_ids uuid[];
  v_id uuid;
  v_count integer := 0;
begin
  if not public.is_staff() then
    raise exception 'Yalnızca öğretmenler puan verebilir.' using errcode = '42501';
  end if;
  select * into v_show from public.quiz_shows where id = p_show and teacher_id = auth.uid() for update;
  if not found then
    raise exception 'Yarışma bulunamadı.' using errcode = '42501';
  end if;
  if v_show.status <> 'finished' then
    raise exception 'Puan yalnızca biten yarışmada verilebilir.';
  end if;
  if v_show.awarded_at is not null then
    raise exception 'Bu yarışma için davranış puanı zaten verildi.';
  end if;
  if p_points is null or p_points < 1 or p_points > 5 then
    raise exception 'Puan 1 ile 5 arasında olmalıdır.';
  end if;
  select array_agg(distinct x) into v_ids from unnest(coalesce(p_student_ids, '{}'::uuid[])) as x where x is not null;
  if v_ids is null or cardinality(v_ids) = 0 then
    raise exception 'Puan verilecek öğrenci yok.';
  end if;
  if cardinality(v_ids) > 60 then
    raise exception 'Bir seferde en fazla 60 öğrenciye puan verilebilir.';
  end if;

  -- Her öğrenci olağan puan kuralından geçer (öğretmenin görebildiği öğrenci olmalı; biri geçmezse hiçbiri yazılmaz)
  foreach v_id in array v_ids loop
    perform public.staff_give_points(v_id, p_points, left('Bilgi yarışması: ' || v_show.title, 200));
    v_count := v_count + 1;
  end loop;

  perform set_config('app.quiz_show_award', '1', true);
  update public.quiz_shows set awarded_at = now(), awarded_points = p_points where id = p_show;
  perform set_config('app.quiz_show_award', '', true);
  return v_count;
end;
$$;
revoke execute on function public.quiz_show_award(uuid, uuid[], integer) from public, anon;
grant execute on function public.quiz_show_award(uuid, uuid[], integer) to authenticated;

notify pgrst, 'reload schema';
