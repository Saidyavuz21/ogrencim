-- ========================================================
-- Paket 10 · Canlı ders
-- 1) Sesli not: tahta ve ödev alanına ses dosyası türleri
-- 2) Tahta sürüm geçmişi: en çok 10 dakikada bir kopya, son 20 sürüm, 90 gün; geri dönme
-- 3) Canlı ders oturumu (öğretmen + bir sınıf):
--    - öğrenciler öğretmenin sayfasını izler (sayfa, adım parçaları eşzamanlı)
--    - anlık quiz: soru bankadan açılır, doğru cevap öğrenciye gönderilmez; cevaplar canlı sayılır
--    - öğrencinin kendi çizimi (özel katman); öğretmen birini seçip sınıfa yansıtır
--    - kalem izni: bir öğrenciye süreli (ör. 30 sn) ya da herkese (ortak çalışma) ortak katmana yazma
--    Her yazma sunucu fonksiyonuyla yapılır; okuma RLS ile (Realtime de aynı kuralları uygular).
--    Oturum bitince çizimler ve katılım bilgisi silinir; cevaplar 30 gün sonra silinir.
-- ========================================================

-- --------------------------------------------------------
-- 1) Sesli not dosya türleri
-- --------------------------------------------------------
update storage.buckets
   set allowed_mime_types = array(
         select distinct t from unnest(coalesce(allowed_mime_types, '{}'::text[])
           || array['audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav']) as t
       )
 where id in ('board-images', 'homework-files');

-- --------------------------------------------------------
-- 2) Tahta sürüm geçmişi
-- --------------------------------------------------------
create table if not exists public.board_versions (
  id bigint generated always as identity primary key,
  board_id uuid not null references public.boards(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  content jsonb not null,
  page_count integer not null default 0,
  bytes integer not null default 0,
  reason text not null default 'auto' check (reason in ('auto', 'restore')),
  created_at timestamptz not null default now()
);
create index if not exists board_versions_board_idx on public.board_versions (board_id, created_at desc);
create index if not exists board_versions_teacher_idx on public.board_versions (teacher_id);
alter table public.board_versions enable row level security;
revoke all on public.board_versions from public, anon, authenticated;
grant select on public.board_versions to authenticated;
drop policy if exists board_versions_select on public.board_versions;
create policy board_versions_select on public.board_versions for select to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()));

create or replace function private.board_snapshot(p_board uuid, p_teacher uuid, p_content jsonb, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.board_versions (board_id, teacher_id, content, page_count, bytes, reason)
  values (p_board, p_teacher, p_content, coalesce(jsonb_array_length(p_content -> 'pages'), 0), octet_length(p_content::text), p_reason);
  delete from public.board_versions
   where board_id = p_board
     and (created_at < now() - interval '90 days'
          or id not in (select v.id from public.board_versions v where v.board_id = p_board order by v.created_at desc, v.id desc limit 20));
end;
$$;
revoke all on function private.board_snapshot(uuid, uuid, jsonb, text) from public, anon, authenticated;

-- Değişiklikten önceki hâl saklanır; 10 dakika içinde ikinci kopya alınmaz, boş tahta saklanmaz
create or replace function private.boards_version_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.content is distinct from old.content
     and exists (
       select 1 from jsonb_array_elements(coalesce(old.content -> 'pages', '[]'::jsonb)) p
       where jsonb_array_length(coalesce(p -> 'elements', '[]'::jsonb)) > 0
     )
     and not exists (
       select 1 from public.board_versions where board_id = old.id and created_at > now() - interval '10 minutes'
     ) then
    perform private.board_snapshot(old.id, old.teacher_id, old.content, 'auto');
  end if;
  return new;
end;
$$;
revoke all on function private.boards_version_trigger() from public, anon, authenticated;
drop trigger if exists boards_version on public.boards;
create trigger boards_version after update of content on public.boards
  for each row execute function private.boards_version_trigger();

-- Sürüme dön: o anki hâl de sürüm olarak saklanır
create or replace function public.board_restore_version(p_version bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.board_versions;
  b public.boards;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.'; end if;
  select * into v from public.board_versions where id = p_version and teacher_id = auth.uid();
  if not found then raise exception 'Sürüm bulunamadı.'; end if;
  select * into b from public.boards where id = v.board_id and teacher_id = auth.uid() for update;
  if not found then raise exception 'Tahta bulunamadı.'; end if;
  perform private.board_snapshot(b.id, b.teacher_id, b.content, 'restore');
  update public.boards set content = v.content where id = b.id;
  return v.content;
end;
$$;
revoke all on function public.board_restore_version(bigint) from public, anon;
grant execute on function public.board_restore_version(bigint) to authenticated;

-- --------------------------------------------------------
-- 3) Canlı ders
-- --------------------------------------------------------
create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  class_name text not null check (char_length(btrim(class_name)) between 1 and 20),
  board_id uuid references public.boards(id) on delete set null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  page_index integer not null default 0 check (page_index between 0 and 49),
  step_state jsonb not null default '{}'::jsonb check (jsonb_typeof(step_state) = 'object' and octet_length(step_state::text) <= 4096),
  question jsonb,
  projected_student uuid references public.students(id) on delete set null,
  pen_student uuid references public.students(id) on delete set null,
  pen_until timestamptz,
  pen_all boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index if not exists live_sessions_one_active on public.live_sessions (teacher_id) where ended_at is null;
create index if not exists live_sessions_class_idx on public.live_sessions (school_id, class_name) where ended_at is null;
create index if not exists live_sessions_started_idx on public.live_sessions (started_at);
alter table public.live_sessions enable row level security;

-- Öğrenci görür: sınıfının oturumu, 8 saatten eski değil; bitince 10 dk daha (bitiş olayı ulaşsın)
create or replace function public.live_student_sees(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = p_session
      and s.started_at > now() - interval '8 hours'
      and (s.ended_at is null or s.ended_at > now() - interval '10 minutes')
      and public.student_in_class(s.class_name, s.school_id)
  );
$$;
revoke all on function public.live_student_sees(uuid) from public, anon;
grant execute on function public.live_student_sees(uuid) to authenticated;

create or replace function public.live_is_teacher(p_session uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.live_sessions s where s.id = p_session and s.teacher_id = auth.uid());
$$;
revoke all on function public.live_is_teacher(uuid) from public, anon;
grant execute on function public.live_is_teacher(uuid) to authenticated;

revoke all on public.live_sessions from public, anon, authenticated;
grant select on public.live_sessions to authenticated;
drop policy if exists live_sessions_select on public.live_sessions;
create policy live_sessions_select on public.live_sessions for select to authenticated
  using (
    teacher_id = (select auth.uid())
    or (
      started_at > now() - interval '8 hours'
      and (ended_at is null or ended_at > now() - interval '10 minutes')
      and public.student_in_class(class_name, school_id)
    )
  );

-- Tahtanın oturuma kopyası ve dosya adresleri (öğretmenin ürettiği süreli adresler)
create table if not exists public.live_content (
  session_id uuid primary key references public.live_sessions(id) on delete cascade,
  content jsonb not null check (octet_length(content::text) <= 5242880),
  media jsonb not null default '{}'::jsonb check (jsonb_typeof(media) = 'object' and octet_length(media::text) <= 524288)
);
alter table public.live_content enable row level security;
revoke all on public.live_content from public, anon, authenticated;
grant select on public.live_content to authenticated;
drop policy if exists live_content_select on public.live_content;
create policy live_content_select on public.live_content for select to authenticated
  using ((select public.live_is_teacher(session_id)) or (select public.live_student_sees(session_id)));

-- Çizim katmanları: ortak (öğretmen ve izinli öğrenciler) ve özel (öğrencinin kendi çözümü)
create table if not exists public.live_layers (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  page_id text not null check (char_length(page_id) between 1 and 64),
  kind text not null check (kind in ('shared', 'private')),
  author_student uuid references public.students(id) on delete cascade,
  strokes jsonb not null default '[]'::jsonb check (jsonb_typeof(strokes) = 'array' and octet_length(strokes::text) <= 262144),
  updated_at timestamptz not null default now(),
  constraint live_layers_owner unique nulls not distinct (session_id, page_id, kind, author_student)
);
alter table public.live_layers enable row level security;

create or replace function public.live_layer_visible(p_session uuid, p_kind text, p_author uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.live_sessions s
    where s.id = p_session
      and (
        s.teacher_id = auth.uid()
        or (
          s.started_at > now() - interval '8 hours'
          and (s.ended_at is null or s.ended_at > now() - interval '10 minutes')
          and public.student_in_class(s.class_name, s.school_id)
          and (p_kind = 'shared' or p_author = public.current_student_id() or p_author = s.projected_student)
        )
      )
  );
$$;
revoke all on function public.live_layer_visible(uuid, text, uuid) from public, anon;
grant execute on function public.live_layer_visible(uuid, text, uuid) to authenticated;

revoke all on public.live_layers from public, anon, authenticated;
grant select on public.live_layers to authenticated;
drop policy if exists live_layers_select on public.live_layers;
create policy live_layers_select on public.live_layers for select to authenticated
  using (public.live_layer_visible(session_id, kind, author_student));

-- Anlık quiz cevapları
create table if not exists public.live_answers (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  question_key uuid not null,
  student_id uuid not null references public.students(id) on delete cascade,
  choice smallint not null check (choice between 0 and 9),
  answered_at timestamptz not null default now(),
  primary key (session_id, question_key, student_id)
);
alter table public.live_answers enable row level security;
revoke all on public.live_answers from public, anon, authenticated;
grant select on public.live_answers to authenticated;
drop policy if exists live_answers_select on public.live_answers;
create policy live_answers_select on public.live_answers for select to authenticated
  using (student_id = (select public.current_student_id()) or (select public.live_is_teacher(session_id)));

-- Katılanlar (30 sn'de bir "buradayım")
create table if not exists public.live_participants (
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (session_id, student_id)
);
alter table public.live_participants enable row level security;
revoke all on public.live_participants from public, anon, authenticated;
grant select on public.live_participants to authenticated;
drop policy if exists live_participants_select on public.live_participants;
create policy live_participants_select on public.live_participants for select to authenticated
  using (student_id = (select public.current_student_id()) or (select public.live_is_teacher(session_id)));

-- Doğru cevaplar öğrencinin okuyamadığı şemada
create table if not exists private.live_question_keys (
  key uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  question_id uuid,
  correct_index smallint not null,
  explanation text,
  created_at timestamptz not null default now()
);
create index if not exists live_question_keys_session_idx on private.live_question_keys (session_id);

-- --------------------------------------------------------
-- Fonksiyonlar
-- --------------------------------------------------------

-- Öğretmenin açık oturumu (kilitli)
create or replace function private.live_own_session(p_session uuid)
returns public.live_sessions
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
begin
  select * into s from public.live_sessions
   where id = p_session and teacher_id = auth.uid() and ended_at is null
   for update;
  if not found or not public.is_staff() then raise exception 'Canlı ders bulunamadı ya da bitti.'; end if;
  return s;
end;
$$;
revoke all on function private.live_own_session(uuid) from public, anon, authenticated;

-- Başlat: öğretmenin önceki açık oturumu kapanır; 30 günden eski oturumlar temizlenir
create or replace function public.live_start(p_class text, p_board uuid, p_title text, p_content jsonb, p_media jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_class text := btrim(coalesce(p_class, ''));
begin
  if not public.is_staff() then raise exception 'Yalnızca öğretmenler canlı ders başlatabilir.'; end if;
  if not public.teacher_has_class(v_class) then raise exception 'Bu sınıfta yetkiniz yok.'; end if;
  perform private.check_rate('live_start', 30, 3600);
  if p_board is not null and not exists (select 1 from public.boards where id = p_board and teacher_id = auth.uid()) then
    raise exception 'Tahta bulunamadı.';
  end if;
  if jsonb_typeof(p_content -> 'pages') is distinct from 'array' or jsonb_array_length(p_content -> 'pages') = 0 then
    raise exception 'Tahtada en az bir sayfa olmalı.';
  end if;
  if jsonb_array_length(p_content -> 'pages') > 50 then raise exception 'Bir tahtada en fazla 50 sayfa olabilir.'; end if;
  if octet_length(p_content::text) > 5242880 then raise exception 'Tahta 5 MB sınırını aşıyor.'; end if;

  -- Eski oturumlar: 30 günden eskiler silinir, unutulan açık oturumlar (8 saat) kapanır
  delete from public.live_sessions where coalesce(ended_at, started_at) < now() - interval '30 days';
  update public.live_sessions set ended_at = now(), pen_student = null, pen_all = false
   where ended_at is null and (teacher_id = auth.uid() or started_at < now() - interval '8 hours');
  delete from public.live_layers l using public.live_sessions s where l.session_id = s.id and s.ended_at is not null;
  delete from public.live_participants p using public.live_sessions s where p.session_id = s.id and s.ended_at is not null;

  insert into public.live_sessions (teacher_id, school_id, class_name, board_id, title)
  values (auth.uid(), public.my_school_id(), v_class, p_board, left(btrim(coalesce(nullif(btrim(p_title), ''), 'Canlı ders')), 120))
  returning id into v_id;
  insert into public.live_content (session_id, content, media)
  values (v_id, p_content, case when jsonb_typeof(p_media) = 'object' then p_media else '{}'::jsonb end);
  return v_id;
end;
$$;
revoke all on function public.live_start(text, uuid, text, jsonb, jsonb) from public, anon;
grant execute on function public.live_start(text, uuid, text, jsonb, jsonb) to authenticated;

-- Öğretmen: sayfa, adım, yansıtma, kalem izni, soruyu kaldırma
-- p_patch: page_index, step_state, projected_student (uuid|null), pen_student (uuid|null) + pen_seconds (1–120),
--          pen_all (bool), clear_question (true)
create or replace function public.live_control(p_session uuid, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
  v_student uuid;
  v_secs integer;
begin
  s := private.live_own_session(p_session);
  perform private.check_rate('live_control', 900, 60);
  if jsonb_typeof(p_patch) is distinct from 'object' then raise exception 'Geçersiz istek.'; end if;

  if p_patch ? 'page_index' then
    s.page_index := greatest(0, least(49, (p_patch ->> 'page_index')::integer));
  end if;
  if p_patch ? 'step_state' then
    if jsonb_typeof(p_patch -> 'step_state') is distinct from 'object' or octet_length((p_patch -> 'step_state')::text) > 4096 then
      raise exception 'Geçersiz adım bilgisi.';
    end if;
    s.step_state := p_patch -> 'step_state';
  end if;
  if p_patch ? 'projected_student' then
    v_student := nullif(p_patch ->> 'projected_student', '')::uuid;
    if v_student is not null and not public.student_is_member(v_student, s.class_name, s.school_id) then
      raise exception 'Öğrenci bu sınıfta değil.';
    end if;
    s.projected_student := v_student;
  end if;
  if p_patch ? 'pen_student' then
    v_student := nullif(p_patch ->> 'pen_student', '')::uuid;
    if v_student is null then
      s.pen_student := null;
      s.pen_until := null;
    else
      if not public.student_is_member(v_student, s.class_name, s.school_id) then raise exception 'Öğrenci bu sınıfta değil.'; end if;
      v_secs := greatest(1, least(120, coalesce((p_patch ->> 'pen_seconds')::integer, 30)));
      s.pen_student := v_student;
      s.pen_until := now() + make_interval(secs => v_secs);
    end if;
  end if;
  if p_patch ? 'pen_all' then
    s.pen_all := coalesce((p_patch ->> 'pen_all')::boolean, false);
  end if;
  if coalesce((p_patch ->> 'clear_question')::boolean, false) then
    s.question := null;
  end if;

  update public.live_sessions
     set page_index = s.page_index, step_state = s.step_state, projected_student = s.projected_student,
         pen_student = s.pen_student, pen_until = s.pen_until, pen_all = s.pen_all, question = s.question,
         updated_at = now()
   where id = s.id;
end;
$$;
revoke all on function public.live_control(uuid, jsonb) from public, anon;
grant execute on function public.live_control(uuid, jsonb) to authenticated;

-- Öğretmen: bankadaki soruyu sınıfa açar (doğru cevap öğrenciye gitmez).
-- p_image_url: sorunun görseli için öğretmenin ürettiği süreli adres (isteğe bağlı)
create or replace function public.live_open_question(p_session uuid, p_question uuid, p_image_url text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
  q public.quiz_questions;
  v_key uuid;
  v_question jsonb;
begin
  s := private.live_own_session(p_session);
  perform private.check_rate('live_question', 120, 600);
  select * into q from public.quiz_questions where id = p_question and teacher_id = auth.uid();
  if not found then raise exception 'Soru bulunamadı.'; end if;
  if p_image_url is not null and (char_length(p_image_url) > 2000 or p_image_url !~ '^https://') then
    raise exception 'Görsel adresi geçersiz.';
  end if;
  insert into private.live_question_keys (session_id, question_id, correct_index, explanation)
  values (s.id, q.id, q.correct_index, q.explanation)
  returning key into v_key;
  v_question := jsonb_build_object(
    'key', v_key, 'body', q.body, 'choices', to_jsonb(q.choices), 'image_url', p_image_url,
    'opened_at', now(), 'closed', false
  );
  update public.live_sessions set question = v_question, updated_at = now() where id = s.id;
  return v_question;
end;
$$;
revoke all on function public.live_open_question(uuid, uuid, text) from public, anon;
grant execute on function public.live_open_question(uuid, uuid, text) to authenticated;

-- Öğretmen: cevapları kapatır; p_reveal ise doğru cevabı ve dağılımı sınıfa gösterir
create or replace function public.live_close_question(p_session uuid, p_reveal boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
  k private.live_question_keys;
  v_key uuid;
  v_counts jsonb;
  v_total integer;
  v_question jsonb;
begin
  s := private.live_own_session(p_session);
  if s.question is null then raise exception 'Açık soru yok.'; end if;
  v_key := (s.question ->> 'key')::uuid;
  select * into k from private.live_question_keys where key = v_key and session_id = s.id;
  if not found then raise exception 'Soru bulunamadı.'; end if;

  select coalesce(jsonb_agg(coalesce(c.n, 0) order by i.idx), '[]'::jsonb), coalesce(sum(c.n), 0)::integer
    into v_counts, v_total
  from generate_series(0, jsonb_array_length(s.question -> 'choices') - 1) as i(idx)
  left join (
    select a.choice, count(*)::integer as n from public.live_answers a
    where a.session_id = s.id and a.question_key = v_key group by a.choice
  ) c on c.choice = i.idx;

  v_question := s.question || jsonb_build_object('closed', true, 'counts', v_counts, 'total', v_total);
  if p_reveal then
    v_question := v_question || jsonb_build_object('correct_index', k.correct_index, 'explanation', k.explanation);
  end if;
  update public.live_sessions set question = v_question, updated_at = now() where id = s.id;
  return v_question;
end;
$$;
revoke all on function public.live_close_question(uuid, boolean) from public, anon;
grant execute on function public.live_close_question(uuid, boolean) to authenticated;

-- Öğrenci: soru açıkken cevap verir (kapanana kadar değiştirebilir)
create or replace function public.live_answer(p_session uuid, p_key uuid, p_choice integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.current_student_id();
  s public.live_sessions;
begin
  if v_student is null then raise exception 'Öğrenci oturumu bulunamadı.'; end if;
  select * into s from public.live_sessions where id = p_session and ended_at is null;
  if not found or not public.student_in_class(s.class_name, s.school_id) then raise exception 'Canlı ders bulunamadı ya da bitti.'; end if;
  if s.question is null or (s.question ->> 'key')::uuid is distinct from p_key then raise exception 'Bu soru artık açık değil.'; end if;
  if coalesce((s.question ->> 'closed')::boolean, false) then raise exception 'Cevaplar kapandı.'; end if;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(s.question -> 'choices') then raise exception 'Geçersiz seçenek.'; end if;
  perform private.check_rate('live_answer', 60, 60);
  insert into public.live_answers (session_id, question_key, student_id, choice)
  values (s.id, p_key, v_student, p_choice)
  on conflict (session_id, question_key, student_id) do update set choice = excluded.choice, answered_at = now();
end;
$$;
revoke all on function public.live_answer(uuid, uuid, integer) from public, anon;
grant execute on function public.live_answer(uuid, uuid, integer) to authenticated;

-- Çizim katmanını kaydeder.
--  Öğretmen: yalnızca ortak katman. Öğrenci: kendi özel katmanı her zaman;
--  ortak katmana yalnızca kalem izni varken (süresine 3 sn tolerans) ya da ortak çalışma açıkken.
create or replace function public.live_save_layer(p_session uuid, p_page text, p_kind text, p_strokes jsonb)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
  v_student uuid;
  v_at timestamptz := now();
begin
  if p_kind not in ('shared', 'private') then raise exception 'Geçersiz katman.'; end if;
  if jsonb_typeof(p_strokes) is distinct from 'array' then raise exception 'Çizim geçersiz.'; end if;
  if octet_length(p_strokes::text) > 262144 then raise exception 'Bu sayfadaki çizim sınırı doldu. Bazı çizgileri silip yeniden dene.'; end if;
  perform private.check_rate('live_layer', 240, 60);
  select * into s from public.live_sessions where id = p_session and ended_at is null;
  if not found then raise exception 'Canlı ders bulunamadı ya da bitti.'; end if;
  if not exists (
    select 1 from public.live_content c, jsonb_array_elements(c.content -> 'pages') p
    where c.session_id = s.id and p ->> 'id' = p_page
  ) then
    raise exception 'Sayfa bulunamadı.';
  end if;

  if s.teacher_id = auth.uid() then
    if p_kind <> 'shared' then raise exception 'Öğretmen ortak katmana yazar.'; end if;
    v_student := null;
  else
    v_student := public.current_student_id();
    if v_student is null or not public.student_in_class(s.class_name, s.school_id) then
      raise exception 'Canlı ders bulunamadı ya da bitti.';
    end if;
    if p_kind = 'shared' and not (s.pen_all or (s.pen_student = v_student and s.pen_until > now() - interval '3 seconds')) then
      raise exception 'Kalem izni yok ya da süresi doldu.';
    end if;
  end if;

  insert into public.live_layers (session_id, page_id, kind, author_student, strokes, updated_at)
  values (s.id, p_page, p_kind, v_student, p_strokes, v_at)
  on conflict on constraint live_layers_owner do update set strokes = excluded.strokes, updated_at = excluded.updated_at;
  return v_at;
end;
$$;
revoke all on function public.live_save_layer(uuid, text, text, jsonb) from public, anon;
grant execute on function public.live_save_layer(uuid, text, text, jsonb) to authenticated;

-- Öğretmen: bir sayfanın ortak katmanını (bütün yazanların) temizler
create or replace function public.live_clear_shared(p_session uuid, p_page text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
begin
  s := private.live_own_session(p_session);
  update public.live_layers set strokes = '[]'::jsonb, updated_at = now()
   where session_id = s.id and page_id = p_page and kind = 'shared' and strokes <> '[]'::jsonb;
end;
$$;
revoke all on function public.live_clear_shared(uuid, text) from public, anon;
grant execute on function public.live_clear_shared(uuid, text) to authenticated;

-- Öğrenci: "buradayım" (katılanlar listesi)
create or replace function public.live_heartbeat(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_student uuid := public.current_student_id();
  s public.live_sessions;
begin
  if v_student is null then return; end if;
  select * into s from public.live_sessions where id = p_session and ended_at is null;
  if not found or not public.student_in_class(s.class_name, s.school_id) then raise exception 'Canlı ders bulunamadı ya da bitti.'; end if;
  perform private.check_rate('live_heartbeat', 12, 60);
  insert into public.live_participants (session_id, student_id) values (s.id, v_student)
  on conflict (session_id, student_id) do update set last_seen = now();
end;
$$;
revoke all on function public.live_heartbeat(uuid) from public, anon;
grant execute on function public.live_heartbeat(uuid) to authenticated;

-- Öğretmen: dersi bitirir; çizimler ve katılım bilgisi silinir
create or replace function public.live_end(p_session uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.live_sessions;
begin
  s := private.live_own_session(p_session);
  update public.live_sessions
     set ended_at = now(), pen_student = null, pen_until = null, pen_all = false, projected_student = null, updated_at = now()
   where id = s.id;
  delete from public.live_layers where session_id = s.id;
  delete from public.live_participants where session_id = s.id;
end;
$$;
revoke all on function public.live_end(uuid) from public, anon;
grant execute on function public.live_end(uuid) to authenticated;

-- --------------------------------------------------------
-- Realtime: değişiklikler RLS'e göre yalnızca görebilene gider
-- --------------------------------------------------------
do $$
declare
  t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['live_sessions', 'live_layers', 'live_answers', 'live_participants'] loop
      if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
        execute format('alter publication supabase_realtime add table public.%I', t);
      end if;
    end loop;
  end if;
end;
$$;
