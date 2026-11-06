-- ========================================================
-- QUIZ MOTORU (EduBoard paket 4)
-- - quiz_questions: öğretmenin soru bankası (metin + görsel, 2–5 şık, doğru şık)
-- - Quiz bir ödev türüdür: homeworks.quiz_mode = 'practice' (alıştırma) | 'exam' (sınav)
-- - quiz_items: yayınlanınca soruların dondurulmuş kopyası (bankadaki değişiklik yayınlanmış quizi bozmaz)
-- - Doğru cevap tarayıcıya asla gitmez: öğrenci soruları/cevapları yalnızca sunucu fonksiyonlarıyla görür,
--   cevap sunucuda değerlendirilir ve puan aynı işlemde yazılır
-- - Alıştırma: anında dönüt, soru başına 3 deneme; puan 1 / 0,5 / 0,25 (1., 2., 3. denemede doğru)
-- - Sınav: teslim tarihi zorunlu; cevap değiştirilebilir, sonuç tarih geçene kadar gizli
-- - Sonuç Ödev kontrolü'ne işlenir: %70+ yaptı, %40–69 kısmen, altı ya da katılmayan yapmadı
-- - Görseller: quiz-images (<öğretmen>/<dosya>); öğrenci yalnızca kendi quizindeki görseli açar
-- ========================================================

-- --------------------------------------------------------
-- Soru bankası
-- --------------------------------------------------------
create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  image_path text check (image_path is null or char_length(image_path) <= 300),
  choices text[] not null check (cardinality(choices) between 2 and 5),
  correct_index smallint not null check (correct_index between 0 and 4),
  explanation text check (explanation is null or char_length(explanation) <= 1000),
  grade text check (grade is null or char_length(grade) <= 30),
  subject text check (subject is null or char_length(subject) <= 80),
  topic text check (topic is null or char_length(topic) <= 120),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists quiz_questions_teacher_idx on public.quiz_questions (teacher_id, created_at desc);
alter table public.quiz_questions enable row level security;

create or replace function public.quiz_questions_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  c text;
begin
  if tg_op = 'INSERT' then
    if not public.is_staff() then raise exception 'Yalnızca öğretmenler soru ekleyebilir.'; end if;
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
    new.created_at := now();
  else
    if new.teacher_id is distinct from old.teacher_id or new.school_id is distinct from old.school_id then
      raise exception 'Bu alan değiştirilemez.';
    end if;
  end if;
  new.updated_at := now();
  new.body := btrim(new.body);
  new.explanation := nullif(btrim(coalesce(new.explanation, '')), '');
  new.grade := nullif(btrim(coalesce(new.grade, '')), '');
  new.subject := nullif(btrim(coalesce(new.subject, '')), '');
  new.topic := nullif(btrim(coalesce(new.topic, '')), '');
  new.choices := array(select btrim(x) from unnest(new.choices) as x);
  foreach c in array new.choices loop
    if char_length(c) = 0 or char_length(c) > 300 then
      raise exception 'Her şık 1–300 karakter olmalı.';
    end if;
  end loop;
  if new.correct_index >= cardinality(new.choices) then
    raise exception 'Doğru şık seçilmeli.';
  end if;
  if new.image_path is not null and split_part(new.image_path, '/', 1) <> new.teacher_id::text then
    raise exception 'Geçersiz görsel.';
  end if;
  new.tags := coalesce((
    select array_agg(t order by min_ord)
    from (
      select left(btrim(x), 30) as t, min(ord) as min_ord
      from unnest(new.tags) with ordinality as u(x, ord)
      where btrim(x) <> ''
      group by left(btrim(x), 30)
    ) d
  ), '{}');
  return new;
end;
$$;
drop trigger if exists quiz_questions_guard on public.quiz_questions;
create trigger quiz_questions_guard before insert or update on public.quiz_questions
  for each row execute function public.quiz_questions_guard();

drop policy if exists quiz_questions_own on public.quiz_questions;
create policy quiz_questions_own on public.quiz_questions for all to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()))
  with check (teacher_id = (select auth.uid()) and (select public.is_staff()));

-- --------------------------------------------------------
-- Quiz = ödev türü
-- --------------------------------------------------------
alter table public.homeworks
  add column if not exists quiz_mode text check (quiz_mode is null or quiz_mode in ('practice', 'exam')),
  add column if not exists quiz_settled_at timestamptz;

alter table public.homeworks drop constraint if exists homeworks_quiz_rules;
alter table public.homeworks add constraint homeworks_quiz_rules check (
  quiz_mode is null or (not accepts_submissions and (quiz_mode <> 'exam' or due_date is not null))
);

-- Yayınlanmış quizin soruları (dondurulmuş kopya)
create table if not exists public.quiz_items (
  id uuid primary key default gen_random_uuid(),
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  position integer not null,
  source_question_id uuid references public.quiz_questions(id) on delete set null,
  body text not null,
  image_path text,
  choices text[] not null,
  correct_index smallint not null,
  explanation text,
  unique (homework_id, position)
);
create index if not exists quiz_items_image_idx on public.quiz_items (image_path) where image_path is not null;
alter table public.quiz_items enable row level security;

-- Öğrenci denemesi (öğrenci başına tek) ve cevaplar
create table if not exists public.quiz_attempts (
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score numeric(7, 2) not null default 0,
  item_count integer not null default 0,
  primary key (homework_id, student_id)
);
alter table public.quiz_attempts enable row level security;

create table if not exists public.quiz_answers (
  homework_id uuid not null,
  student_id uuid not null,
  item_id uuid not null references public.quiz_items(id) on delete cascade,
  choice smallint,
  tries smallint not null default 0,
  correct boolean not null default false,
  points numeric(4, 2) not null default 0,
  last_try_at timestamptz,
  primary key (homework_id, student_id, item_id),
  foreign key (homework_id, student_id) references public.quiz_attempts(homework_id, student_id) on delete cascade
);
alter table public.quiz_answers enable row level security;

-- Öğretmen (ödevin sahibi) okur; öğrenci doğrudan hiçbirine erişemez (yalnızca aşağıdaki fonksiyonlar)
drop policy if exists quiz_items_owner on public.quiz_items;
create policy quiz_items_owner on public.quiz_items for select to authenticated
  using ((select public.owns_homework(homework_id)));
drop policy if exists quiz_attempts_owner on public.quiz_attempts;
create policy quiz_attempts_owner on public.quiz_attempts for select to authenticated
  using ((select public.owns_homework(homework_id)));
drop policy if exists quiz_answers_owner on public.quiz_answers;
create policy quiz_answers_owner on public.quiz_answers for select to authenticated
  using ((select public.owns_homework(homework_id)));

revoke all on public.quiz_questions, public.quiz_items, public.quiz_attempts, public.quiz_answers from anon;
grant select, insert, update, delete on public.quiz_questions to authenticated;
grant select on public.quiz_items, public.quiz_attempts, public.quiz_answers to authenticated;

-- --------------------------------------------------------
-- Yardımcılar
-- --------------------------------------------------------
-- Quiz cevap alıyor mu? (elle kapatılmamış ve teslim anı gelmemiş)
create or replace function public.quiz_is_open(p_hw public.homeworks)
returns boolean language sql stable set search_path = '' as $$
  select p_hw.closed_at is null and (p_hw.due_at is null or p_hw.due_at > now());
$$;

-- Başarı oranına göre ödev durumu
create or replace function public.quiz_status_for(p_percent numeric)
returns text language sql immutable set search_path = '' as $$
  select case when p_percent >= 70 then 'yapti' when p_percent >= 40 then 'kismen' else 'yapmadi' end;
$$;

-- Denemenin puanını yeniden hesaplar (tek işlemde, cevap yazıldıktan hemen sonra)
create or replace function public.quiz_recalc(p_hw uuid, p_student uuid)
returns void language sql security definer set search_path = '' as $$
  update public.quiz_attempts a
     set score = coalesce((select sum(points) from public.quiz_answers x where x.homework_id = p_hw and x.student_id = p_student), 0),
         item_count = (select count(*) from public.quiz_items i where i.homework_id = p_hw)
   where a.homework_id = p_hw and a.student_id = p_student;
$$;

-- Sonucu Ödev kontrolü'ne yazar (öğretmen adına; puan tetikleyicisi davranış puanını işler)
create or replace function public.quiz_write_check(p_hw uuid, p_student uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_teacher uuid;
  v_score numeric;
  v_count integer;
  v_percent numeric;
begin
  select teacher_id into v_teacher from public.homeworks where id = p_hw;
  select score, greatest(item_count, 1) into v_score, v_count from public.quiz_attempts where homework_id = p_hw and student_id = p_student;
  v_percent := round(coalesce(v_score, 0) * 100 / greatest(coalesce(v_count, 1), 1));
  insert into public.homework_checks (homework_id, student_id, status, score, note, checked_by)
  values (p_hw, p_student, public.quiz_status_for(v_percent), v_percent::integer, 'Quiz: %' || v_percent::integer, v_teacher)
  on conflict (homework_id, student_id) do update
    set status = excluded.status, score = excluded.score, note = excluded.note, checked_by = excluded.checked_by, updated_at = now();
end;
$$;

-- Süre dolduysa (ya da öğretmen kapattıysa) quizi bir kez kapatır:
-- yarım kalan denemeler biter, hiç girmeyenler "yapmadı" olur, sınav sonuçları açıklanır
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
  where s.class_name = h.class_name and s.school_id is not distinct from h.school_id
    and not exists (select 1 from public.quiz_attempts a where a.homework_id = p_hw and a.student_id = s.id)
  on conflict (homework_id, student_id) do nothing;

  update public.homeworks
     set quiz_settled_at = now(),
         results_released = case when quiz_mode = 'exam' then true else results_released end
   where id = p_hw;
end;
$$;
revoke execute on function public.quiz_settle(uuid) from public, anon;
grant execute on function public.quiz_settle(uuid) to authenticated;

-- --------------------------------------------------------
-- Öğretmen: quizi yayınlar (soruları bankadan dondurarak kopyalar)
-- --------------------------------------------------------
create or replace function public.quiz_add_items(p_hw uuid, p_question_ids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare
  h public.homeworks;
  v_count integer;
begin
  select * into h from public.homeworks where id = p_hw;
  if not found or h.teacher_id is distinct from auth.uid() or not public.is_staff() then
    raise exception 'Quiz bulunamadı.';
  end if;
  if h.quiz_mode is null then raise exception 'Bu ödev bir quiz değil.'; end if;
  if exists (select 1 from public.quiz_items where homework_id = p_hw) then
    raise exception 'Quizin soruları zaten eklenmiş.';
  end if;
  if coalesce(cardinality(p_question_ids), 0) = 0 or cardinality(p_question_ids) > 100 then
    raise exception 'Quizde 1–100 soru olmalı.';
  end if;
  if (select count(distinct x) from unnest(p_question_ids) as x) <> cardinality(p_question_ids) then
    raise exception 'Aynı soru iki kez eklenemez.';
  end if;
  insert into public.quiz_items (homework_id, position, source_question_id, body, image_path, choices, correct_index, explanation)
  select p_hw, o.ord - 1, q.id, q.body, q.image_path, q.choices, q.correct_index, q.explanation
  from unnest(p_question_ids) with ordinality as o(id, ord)
  join public.quiz_questions q on q.id = o.id and q.teacher_id = auth.uid();
  get diagnostics v_count = row_count;
  if v_count <> cardinality(p_question_ids) then
    raise exception 'Bazı sorular bulunamadı.';
  end if;
  return v_count;
end;
$$;
revoke execute on function public.quiz_add_items(uuid, uuid[]) from public, anon;
grant execute on function public.quiz_add_items(uuid, uuid[]) to authenticated;

-- --------------------------------------------------------
-- Öğrenci: quizin durumu (doğru cevap yalnızca açıklanabiliyorsa döner)
-- --------------------------------------------------------
create or replace function public.quiz_state(p_hw uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  h public.homeworks;
  a public.quiz_attempts;
  v_open boolean;
  v_finished boolean;
  v_reveal_all boolean;
  v_items jsonb;
  v_total integer;
begin
  if v_student is null or not public.student_has_homework(p_hw) then raise exception 'Quiz bulunamadı.'; end if;
  perform public.quiz_settle(p_hw);
  select * into h from public.homeworks where id = p_hw;
  if h.quiz_mode is null then raise exception 'Bu ödev bir quiz değil.'; end if;
  select * into a from public.quiz_attempts where homework_id = p_hw and student_id = v_student;
  v_open := public.quiz_is_open(h);
  v_finished := a.finished_at is not null;
  -- Alıştırma: bitirince her şey açılır; sınav: teslim tarihi geçince
  v_reveal_all := case when h.quiz_mode = 'practice' then v_finished or not v_open else not v_open end;
  select count(*) into v_total from public.quiz_items where homework_id = p_hw;

  select coalesce(jsonb_agg(jsonb_build_object(
      'id', i.id,
      'position', i.position,
      'body', i.body,
      'image_path', i.image_path,
      'choices', to_jsonb(i.choices),
      'choice', x.choice,
      'tries', coalesce(x.tries, 0),
      'resolved', case when h.quiz_mode = 'practice' then coalesce(x.correct, false) or coalesce(x.tries, 0) >= 3 else false end,
      'correct', case when v_reveal_all or (h.quiz_mode = 'practice' and (coalesce(x.correct, false) or coalesce(x.tries, 0) >= 3)) then coalesce(x.correct, false) end,
      'correct_index', case when v_reveal_all or (h.quiz_mode = 'practice' and (coalesce(x.correct, false) or coalesce(x.tries, 0) >= 3)) then i.correct_index end,
      'explanation', case when v_reveal_all or (h.quiz_mode = 'practice' and (coalesce(x.correct, false) or coalesce(x.tries, 0) >= 3)) then i.explanation end,
      'points', case when h.quiz_mode = 'practice' or v_reveal_all then coalesce(x.points, 0) end
    ) order by i.position), '[]'::jsonb)
  into v_items
  from public.quiz_items i
  left join public.quiz_answers x on x.item_id = i.id and x.student_id = v_student
  where i.homework_id = p_hw;

  return jsonb_build_object(
    'mode', h.quiz_mode,
    'open', v_open,
    'due_at', h.due_at,
    'started', a.started_at is not null,
    'finished', v_finished,
    'revealed', v_reveal_all,
    'total', v_total,
    'score', case when h.quiz_mode = 'practice' or v_reveal_all then coalesce(a.score, 0) end,
    'percent', case when h.quiz_mode = 'practice' or v_reveal_all then round(coalesce(a.score, 0) * 100 / greatest(v_total, 1)) end,
    'items', v_items
  );
end;
$$;
revoke execute on function public.quiz_state(uuid) from public, anon;
grant execute on function public.quiz_state(uuid) to authenticated;

-- Öğrencinin bütün quizlerinin özeti (ödev listesi için; puan yalnızca açıklanabiliyorsa)
create or replace function public.my_quizzes()
returns table (homework_id uuid, answered integer, total integer, finished boolean, percent integer)
language sql stable security definer set search_path = '' as $$
  select h.id,
         (select count(*)::integer from public.quiz_answers x where x.homework_id = h.id and x.student_id = me.id and x.tries > 0),
         (select count(*)::integer from public.quiz_items i where i.homework_id = h.id),
         coalesce(a.finished_at is not null, false),
         case when h.quiz_mode = 'practice' or not public.quiz_is_open(h)
              then round(coalesce(a.score, 0) * 100 / greatest((select count(*) from public.quiz_items i where i.homework_id = h.id), 1))::integer end
  from public.students me
  join public.homeworks h on h.class_name = me.class_name and h.school_id is not distinct from me.school_id and h.quiz_mode is not null
  left join public.quiz_attempts a on a.homework_id = h.id and a.student_id = me.id
  where me.id = public.current_student_id();
$$;
revoke execute on function public.my_quizzes() from public, anon;
grant execute on function public.my_quizzes() to authenticated;

-- --------------------------------------------------------
-- Öğrenci: cevap verir. Bütün kurallar burada, tek işlemde:
-- cevabın bu quize ait olması, quizin açık olması, art arda deneme sınırı,
-- doğru çözülenin bozulmaması, 3 deneme sınırı, puanın hesaplanması
-- --------------------------------------------------------
create or replace function public.quiz_answer(p_hw uuid, p_item uuid, p_choice smallint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  h public.homeworks;
  i public.quiz_items;
  x public.quiz_answers;
  v_correct boolean;
  v_points numeric;
  v_finished boolean;
  v_unresolved integer;
begin
  if v_student is null or not public.student_has_homework(p_hw) then raise exception 'Quiz bulunamadı.'; end if;
  select * into h from public.homeworks where id = p_hw;
  if h.quiz_mode is null then raise exception 'Bu ödev bir quiz değil.'; end if;
  if not public.quiz_is_open(h) then raise exception 'Quizin süresi doldu.'; end if;

  select * into i from public.quiz_items where id = p_item and homework_id = p_hw;
  if not found then raise exception 'Bu soru bu quize ait değil.'; end if;
  if p_choice is null or p_choice < 0 or p_choice >= cardinality(i.choices) then raise exception 'Geçersiz şık.'; end if;

  insert into public.quiz_attempts (homework_id, student_id, item_count)
  values (p_hw, v_student, (select count(*) from public.quiz_items where homework_id = p_hw))
  on conflict (homework_id, student_id) do nothing;
  select finished_at is not null into v_finished from public.quiz_attempts where homework_id = p_hw and student_id = v_student for update;
  if v_finished then raise exception 'Quizi bitirdin; cevaplar değiştirilemez.'; end if;

  insert into public.quiz_answers (homework_id, student_id, item_id)
  values (p_hw, v_student, p_item)
  on conflict do nothing;
  select * into x from public.quiz_answers where homework_id = p_hw and student_id = v_student and item_id = p_item for update;

  -- Art arda deneme koruması
  if x.last_try_at is not null and x.last_try_at > now() - (case when h.quiz_mode = 'practice' then interval '1.5 seconds' else interval '0.3 seconds' end) then
    raise exception 'Biraz yavaş: bir saniye bekleyip yeniden dene.';
  end if;

  v_correct := p_choice = i.correct_index;

  if h.quiz_mode = 'practice' then
    if x.correct then
      raise exception 'Bu soruyu zaten doğru çözdün.';
    end if;
    if x.tries >= 3 then
      raise exception 'Bu soru için deneme hakkın bitti.';
    end if;
    v_points := case when v_correct then case x.tries when 0 then 1 when 1 then 0.5 else 0.25 end else 0 end;
    update public.quiz_answers
       set choice = p_choice, tries = x.tries + 1, correct = v_correct, points = v_points, last_try_at = now()
     where homework_id = p_hw and student_id = v_student and item_id = p_item;
  else
    update public.quiz_answers
       set choice = p_choice, tries = least(x.tries + 1, 32000), correct = v_correct, points = case when v_correct then 1 else 0 end, last_try_at = now()
     where homework_id = p_hw and student_id = v_student and item_id = p_item;
  end if;

  perform public.quiz_recalc(p_hw, v_student);

  -- Alıştırma: bütün sorular çözülünce (doğru ya da 3 deneme) kendiliğinden biter
  if h.quiz_mode = 'practice' then
    select count(*) into v_unresolved
    from public.quiz_items qi
    left join public.quiz_answers qa on qa.item_id = qi.id and qa.student_id = v_student
    where qi.homework_id = p_hw and not (coalesce(qa.correct, false) or coalesce(qa.tries, 0) >= 3);
    if v_unresolved = 0 then
      update public.quiz_attempts set finished_at = now() where homework_id = p_hw and student_id = v_student;
      perform public.quiz_write_check(p_hw, v_student);
    end if;
    select * into x from public.quiz_answers where homework_id = p_hw and student_id = v_student and item_id = p_item;
    return jsonb_build_object(
      'correct', x.correct,
      'tries', x.tries,
      'resolved', x.correct or x.tries >= 3,
      'correct_index', case when x.correct or x.tries >= 3 then i.correct_index end,
      'explanation', case when x.correct or x.tries >= 3 then i.explanation end,
      'points', x.points,
      'finished', v_unresolved = 0
    );
  end if;

  return jsonb_build_object('saved', true, 'choice', p_choice);
end;
$$;
revoke execute on function public.quiz_answer(uuid, uuid, smallint) from public, anon;
grant execute on function public.quiz_answer(uuid, uuid, smallint) to authenticated;

-- Öğrenci quizi bitirir / sınavı teslim eder (sonra cevap değiştirilemez)
create or replace function public.quiz_finish(p_hw uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  h public.homeworks;
begin
  if v_student is null or not public.student_has_homework(p_hw) then raise exception 'Quiz bulunamadı.'; end if;
  select * into h from public.homeworks where id = p_hw;
  if h.quiz_mode is null then raise exception 'Bu ödev bir quiz değil.'; end if;
  if not public.quiz_is_open(h) then raise exception 'Quizin süresi doldu.'; end if;
  insert into public.quiz_attempts (homework_id, student_id, item_count)
  values (p_hw, v_student, (select count(*) from public.quiz_items where homework_id = p_hw))
  on conflict (homework_id, student_id) do nothing;
  update public.quiz_attempts set finished_at = now()
   where homework_id = p_hw and student_id = v_student and finished_at is null;
  if found then
    perform public.quiz_recalc(p_hw, v_student);
    perform public.quiz_write_check(p_hw, v_student);
  end if;
end;
$$;
revoke execute on function public.quiz_finish(uuid) from public, anon;
grant execute on function public.quiz_finish(uuid) to authenticated;

-- İç fonksiyonlar doğrudan çağrılamaz
revoke execute on function public.quiz_recalc(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.quiz_write_check(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.quiz_questions_guard() from public, anon, authenticated;

-- --------------------------------------------------------
-- Davranış puanı geçmişinde öğretmenin adı (quiz sonucunu öğrenci bitirdiğinde de)
-- --------------------------------------------------------
create or replace function public.apply_homework_points(p_student_id uuid, p_homework_id uuid, p_delta integer, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_title text;
  v_teacher text;
  v_hw_teacher text;
begin
  if p_delta = 0 then
    return;
  end if;
  select title, teacher_name into v_title, v_hw_teacher from public.homeworks where id = p_homework_id;
  select nullif(full_name, '') into v_teacher from public.profiles where id = auth.uid() and role in ('admin', 'ogretmen');

  update public.students
     set points = coalesce(points, 0) + p_delta,
         plus_count = coalesce(plus_count, 0) + case when p_delta > 0 then 1 else 0 end,
         minus_count = coalesce(minus_count, 0) + case when p_delta < 0 then 1 else 0 end
   where id = p_student_id;
  if not found then
    return;
  end if;

  insert into public.points_history (student_id, teacher_name, change_type, amount, reason)
  values (
    p_student_id,
    coalesce(v_teacher, nullif(v_hw_teacher, ''), 'Öğretmen'),
    case when p_delta > 0 then 'plus' else 'minus' end,
    p_delta,
    left(p_reason || coalesce(': ' || v_title, ''), 200)
  );
end;
$$;
revoke execute on function public.apply_homework_points(uuid, uuid, integer, text) from public, anon, authenticated;

-- --------------------------------------------------------
-- Görseller
-- --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quiz-images', 'quiz-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.student_can_read_quiz_image(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.quiz_items i
    where i.image_path = p_path and public.student_has_homework(i.homework_id)
  );
$$;
revoke execute on function public.student_can_read_quiz_image(text) from public, anon;
grant execute on function public.student_can_read_quiz_image(text) to authenticated;

drop policy if exists quiz_images_insert on storage.objects;
create policy quiz_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'quiz-images' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_staff()));
drop policy if exists quiz_images_select on storage.objects;
create policy quiz_images_select on storage.objects for select to authenticated
  using (
    bucket_id = 'quiz-images'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.student_can_read_quiz_image(name)))
  );
drop policy if exists quiz_images_delete on storage.objects;
create policy quiz_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'quiz-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
