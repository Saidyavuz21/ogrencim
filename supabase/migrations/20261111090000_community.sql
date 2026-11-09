-- ========================================================
-- Paket 11 · Topluluk / Keşfet
-- Öğretmen tahtasını ya da soru setini platformdaki bütün öğretmenlerle paylaşır (öğrenciler görmez).
--  - Paylaşılan içerik dondurulmuş kopyadır; görseller/sesler "community" deposuna kopyalanır.
--  - Paylaşımdan önce metinler taranır: okuldaki öğrenci adları, e-posta, telefon, TC kimlik no → reddedilir.
--  - Kopyalama: önce kotadan yer ayrılır (rezervasyon), dosyalar kopyalanır, sonra tamamlanır;
--    hata olursa rezervasyon iptal edilir ve kopyalanan dosyalar istemcide silinir.
--  - Kopyada kaynak (yazar, başlık) saklanır; kopyadan yeniden paylaşılan içerik orijinaline bağlanır.
--  - 1–5 yıldız (kendi içeriğine verilemez), favoriler, kopya sayısı, son 14 günün kopyaları (trend).
--  - Editörün seçimi ve gizleme yalnızca süper admin.
-- Depolama: community (<öğretmen>/<içerik>/<dosya>)
-- ========================================================

-- --------------------------------------------------------
-- İçerikler
-- --------------------------------------------------------
create table if not exists public.community_items (
  id uuid primary key,
  author_id uuid not null references auth.users(id) on delete cascade,
  author_name text not null default '',
  kind text not null check (kind in ('board', 'questions')),
  title text not null check (char_length(btrim(title)) between 3 and 120),
  description text check (description is null or char_length(description) <= 1000),
  grade text check (grade is null or char_length(grade) <= 30),
  subject text check (subject is null or char_length(subject) <= 80),
  outcomes text[] not null default '{}' check (cardinality(outcomes) <= 10),
  tags text[] not null default '{}' check (cardinality(tags) <= 12),
  content jsonb check (content is null or octet_length(content::text) <= 5242880),
  questions jsonb not null default '[]'::jsonb check (jsonb_typeof(questions) = 'array' and octet_length(questions::text) <= 1048576),
  page_count integer not null default 0,
  question_count integer not null default 0,
  media_bytes bigint not null default 0,
  parent_item_id uuid references public.community_items(id) on delete set null,
  origin_author text,
  origin_title text,
  rating_sum integer not null default 0,
  rating_count integer not null default 0,
  copy_count integer not null default 0,
  featured boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists community_items_created_idx on public.community_items (created_at desc) where not hidden;
create index if not exists community_items_author_idx on public.community_items (author_id);
create index if not exists community_items_outcomes_idx on public.community_items using gin (outcomes);
alter table public.community_items enable row level security;
revoke all on public.community_items from public, anon, authenticated;
grant select on public.community_items to authenticated;
drop policy if exists community_items_select on public.community_items;
create policy community_items_select on public.community_items for select to authenticated
  using ((select public.is_staff()) and (not hidden or author_id = (select auth.uid()) or (select public.is_admin())));

create table if not exists public.community_ratings (
  item_id uuid not null references public.community_items(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (item_id, teacher_id)
);
alter table public.community_ratings enable row level security;
revoke all on public.community_ratings from public, anon, authenticated;
grant select on public.community_ratings to authenticated;
drop policy if exists community_ratings_select on public.community_ratings;
create policy community_ratings_select on public.community_ratings for select to authenticated
  using (teacher_id = (select auth.uid()));

create table if not exists public.community_favorites (
  item_id uuid not null references public.community_items(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, teacher_id)
);
alter table public.community_favorites enable row level security;
revoke all on public.community_favorites from public, anon, authenticated;
grant select on public.community_favorites to authenticated;
drop policy if exists community_favorites_select on public.community_favorites;
create policy community_favorites_select on public.community_favorites for select to authenticated
  using (teacher_id = (select auth.uid()));

-- Kopya kaydı (trend: son 14 gün); kimin kopyaladığı yalnızca sayım için tutulur, kimseye gösterilmez
create table if not exists public.community_copies (
  id bigint generated always as identity primary key,
  item_id uuid not null references public.community_items(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists community_copies_item_idx on public.community_copies (item_id, created_at desc);
alter table public.community_copies enable row level security;
revoke all on public.community_copies from public, anon, authenticated;

-- Kopyalama rezervasyonu (kota ayırma); 15 dakikada düşer
create table if not exists private.community_reservations (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null,
  item_id uuid not null references public.community_items(id) on delete cascade,
  bytes bigint not null,
  expires_at timestamptz not null default now() + interval '15 minutes'
);
create index if not exists community_reservations_teacher_idx on private.community_reservations (teacher_id, expires_at);

-- Tahtanın kaynağı (topluluktan kopyalandıysa); istemci yazamaz
create table if not exists public.board_sources (
  board_id uuid primary key references public.boards(id) on delete cascade,
  item_id uuid references public.community_items(id) on delete set null,
  author_name text not null default '',
  title text not null default '',
  created_at timestamptz not null default now()
);
alter table public.board_sources enable row level security;
revoke all on public.board_sources from public, anon, authenticated;
grant select on public.board_sources to authenticated;
drop policy if exists board_sources_select on public.board_sources;
create policy board_sources_select on public.board_sources for select to authenticated
  using (exists (select 1 from public.boards b where b.id = board_id and b.teacher_id = (select auth.uid())));

-- Yıldız toplamı
create or replace function private.community_rating_sync()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item uuid := coalesce(new.item_id, old.item_id);
begin
  update public.community_items i
     set rating_sum = coalesce((select sum(stars) from public.community_ratings r where r.item_id = v_item), 0),
         rating_count = (select count(*) from public.community_ratings r where r.item_id = v_item)
   where i.id = v_item;
  return null;
end;
$$;
revoke all on function private.community_rating_sync() from public, anon, authenticated;
drop trigger if exists community_rating_sync on public.community_ratings;
create trigger community_rating_sync after insert or update or delete on public.community_ratings
  for each row execute function private.community_rating_sync();

-- --------------------------------------------------------
-- Depolama
-- --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('community', 'community', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg', 'audio/wav'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists community_insert on storage.objects;
create policy community_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'community' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_staff()));
drop policy if exists community_select on storage.objects;
create policy community_select on storage.objects for select to authenticated
  using (
    bucket_id = 'community'
    and (select public.is_staff())
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from public.community_items i
        where i.id::text = (storage.foldername(name))[2] and (not i.hidden or (select public.is_admin()))
      )
    )
  );
drop policy if exists community_delete on storage.objects;
create policy community_delete on storage.objects for delete to authenticated
  using (bucket_id = 'community' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- --------------------------------------------------------
-- Yardımcılar
-- --------------------------------------------------------

-- Öğretmenin depoda kullandığı alan: dosyalar + tahta görselleri/sesleri + soru görselleri + açık rezervasyonlar
create or replace function private.teacher_media_used(p_teacher uuid)
returns bigint
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select sum((o.metadata ->> 'size')::bigint) from storage.objects o
    where o.bucket_id in ('teacher-files', 'board-images', 'quiz-images') and (storage.foldername(o.name))[1] = p_teacher::text
  ), 0) + coalesce((
    select sum(r.bytes) from private.community_reservations r where r.teacher_id = p_teacher and r.expires_at > now()
  ), 0);
$$;
revoke all on function private.teacher_media_used(uuid) from public, anon, authenticated;

-- Kişisel veri taraması: okuldaki öğrenci adları (ad + soyad, tam eşleşme), e-posta, telefon, TC kimlik no
create or replace function private.community_pii(p_text text, p_school uuid)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_text text := lower(coalesce(p_text, ''));
  v_found text[] := '{}';
  v_name text;
begin
  if v_text = '' then return v_found; end if;
  if v_text ~ '[a-z0-9._%+-]+@[a-z0-9-]+\.[a-z0-9.-]+' then v_found := v_found || 'e-posta adresi'::text; end if;
  if v_text ~ '(\+90|\m0)?\s?5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\M' then v_found := v_found || 'telefon numarası'::text; end if;
  if v_text ~ '\m[1-9]\d{10}\M' then v_found := v_found || 'TC kimlik numarası olabilecek 11 haneli sayı'::text; end if;
  if p_school is not null then
    for v_name in
      select distinct s.name from public.students s
      where s.school_id = p_school and char_length(btrim(s.name)) >= 5 and position(' ' in btrim(s.name)) > 0
    loop
      if position(lower(btrim(v_name)) in v_text) > 0 then
        v_found := v_found || ('öğrenci adı: ' || v_name)::text;
      end if;
      exit when cardinality(v_found) >= 8;
    end loop;
  end if;
  return v_found;
end;
$$;
revoke all on function private.community_pii(text, uuid) from public, anon, authenticated;

-- Tahta ve sorulardaki metinler (tarama için)
create or replace function private.community_text(p_content jsonb, p_questions jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat_ws(E'\n',
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_content, '{}'::jsonb), '$.pages[*].elements[*].text') v),
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_content, '{}'::jsonb), '$.pages[*].elements[*].data.title') v),
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_content, '{}'::jsonb), '$.pages[*].elements[*].data.steps[*]') v),
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_content, '{}'::jsonb), '$.pages[*].elements[*].data.pairs[*].*') v),
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_questions, '[]'::jsonb), '$[*].body') v),
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_questions, '[]'::jsonb), '$[*].choices[*]') v),
    (select string_agg(v #>> '{}', E'\n') from jsonb_path_query(coalesce(p_questions, '[]'::jsonb), '$[*].explanation') v)
  );
$$;
revoke all on function private.community_text(jsonb, jsonb) from public, anon, authenticated;

-- Medya eşlemesi: "kaynak bucket/yol" → hedef yol. Hedef, kullanıcının hedef klasöründe olmalı.
create or replace function private.community_map(p_map jsonb, p_bucket text, p_path text, p_prefix text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := p_map ->> (p_bucket || '/' || p_path);
begin
  if v is null or left(v, char_length(p_prefix)) <> p_prefix or v like '%..%' then
    raise exception 'Dosya eşlemesi eksik ya da geçersiz: %', p_path;
  end if;
  return v;
end;
$$;
revoke all on function private.community_map(jsonb, text, text, text) from public, anon, authenticated;

-- Tahta içeriğindeki görsel/ses yollarını eşler; p_from_bucket dışındakiler (ör. eski ödev kopyaları) reddedilir
create or replace function private.community_rewrite_media(p_content jsonb, p_map jsonb, p_from_bucket text, p_to_bucket text, p_prefix text)
returns jsonb
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_pages jsonb := coalesce(p_content -> 'pages', '[]'::jsonb);
  v_out jsonb := '[]'::jsonb;
  v_els jsonb;
  v_el jsonb;
  v_new jsonb;
begin
  for i in 0 .. jsonb_array_length(v_pages) - 1 loop
    v_els := coalesce(v_pages -> i -> 'elements', '[]'::jsonb);
    v_new := '[]'::jsonb;
    for j in 0 .. jsonb_array_length(v_els) - 1 loop
      v_el := v_els -> j;
      if v_el ->> 'type' = 'image' then
        if v_el ->> 'bucket' is distinct from p_from_bucket then raise exception 'Bu görsel paylaşılamaz (tahtaya yeniden ekleyin).'; end if;
        v_el := v_el || jsonb_build_object('bucket', p_to_bucket, 'path', private.community_map(p_map, p_from_bucket, v_el ->> 'path', p_prefix));
      elsif v_el ->> 'type' = 'widget' and v_el ->> 'kind' = 'audio' and v_el #>> '{data,audio,path}' is not null then
        if v_el #>> '{data,audio,bucket}' is distinct from p_from_bucket then raise exception 'Bu ses paylaşılamaz (yeniden kaydedin).'; end if;
        v_el := jsonb_set(v_el, '{data,audio}', (v_el #> '{data,audio}') || jsonb_build_object('bucket', p_to_bucket,
          'path', private.community_map(p_map, p_from_bucket, v_el #>> '{data,audio,path}', p_prefix)));
      end if;
      v_new := v_new || jsonb_build_array(v_el);
    end loop;
    v_out := v_out || jsonb_build_array(jsonb_set(v_pages -> i, '{elements}', v_new));
  end loop;
  return jsonb_set(p_content, '{pages}', v_out);
end;
$$;
revoke all on function private.community_rewrite_media(jsonb, jsonb, text, text, text) from public, anon, authenticated;

-- Kazanım kodları: büyük harf, MAT.8.1.1.1 / T.4.3.5 / FB.5.1.1 biçimi
create or replace function private.community_outcomes(p text[])
returns text[]
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_out text[] := '{}';
  v text;
begin
  foreach v in array coalesce(p, '{}') loop
    v := upper(btrim(v));
    if v = '' then continue; end if;
    if v !~ '^[A-ZÇĞİÖŞÜ]{1,6}(\.[0-9A-Z]{1,3}){1,5}$' then
      raise exception 'Kazanım kodu geçersiz: % (ör. MAT.8.1.1.1)', v;
    end if;
    if not v = any(v_out) then v_out := v_out || v; end if;
  end loop;
  if cardinality(v_out) > 10 then raise exception 'En çok 10 kazanım kodu girilebilir.'; end if;
  return v_out;
end;
$$;
revoke all on function private.community_outcomes(text[]) from public, anon, authenticated;

-- --------------------------------------------------------
-- Paylaşma
-- p_media: "board-images/<yol>" ya da "quiz-images/<yol>" → "community" içindeki yeni yol (<öğretmen>/<içerik>/<dosya>)
-- p_dry_run: yalnızca tarama sonucu döner, hiçbir şey kaydedilmez
-- --------------------------------------------------------
create or replace function public.community_publish(
  p_id uuid, p_kind text, p_board uuid, p_question_ids uuid[],
  p_title text, p_description text, p_grade text, p_subject text, p_outcomes text[], p_tags text[],
  p_media jsonb, p_confirm boolean, p_dry_run boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_school uuid := public.my_school_id();
  b public.boards;
  v_content jsonb;
  v_questions jsonb := '[]'::jsonb;
  v_ids uuid[];
  v_prefix text := v_uid::text || '/' || p_id::text || '/';
  v_findings text[];
  v_outcomes text[];
  v_media_bytes bigint;
  v_missing integer;
  v_parent uuid;
  v_origin_author text;
  v_origin_title text;
  v_name text;
  q record;
begin
  if not public.is_staff() then raise exception 'Yalnızca öğretmenler paylaşabilir.'; end if;
  if p_kind not in ('board', 'questions') then raise exception 'Geçersiz içerik türü.'; end if;
  if p_id is null then raise exception 'İçerik kimliği eksik.'; end if;
  if char_length(btrim(coalesce(p_title, ''))) < 3 then raise exception 'Başlık en az 3 karakter olmalı.'; end if;
  v_outcomes := private.community_outcomes(p_outcomes);

  if p_kind = 'board' then
    select * into b from public.boards where id = p_board and teacher_id = v_uid;
    if not found then raise exception 'Tahta bulunamadı.'; end if;
    if not exists (select 1 from jsonb_array_elements(b.content -> 'pages') p where jsonb_array_length(coalesce(p -> 'elements', '[]'::jsonb)) > 0) then
      raise exception 'Tahta boş; paylaşmadan önce içerik ekleyin.';
    end if;
    v_content := b.content;
    -- Mini Test soruları içeriğe gömülür (kopyalayan öğretmenin bankasına eklenir)
    select array_agg(distinct (v ->> 'questionId')::uuid) into v_ids
    from jsonb_path_query(b.content, '$.pages[*].elements[*] ? (@.type == "widget" && @.kind == "minitest").data') v
    where v ->> 'questionId' is not null;
    select source.item_id, source.author_name, source.title into v_parent, v_origin_author, v_origin_title
    from public.board_sources source where source.board_id = b.id;
  else
    v_ids := p_question_ids;
    if coalesce(cardinality(v_ids), 0) = 0 then raise exception 'En az bir soru seçin.'; end if;
    if cardinality(v_ids) > 100 then raise exception 'Bir sette en çok 100 soru olabilir.'; end if;
  end if;

  if coalesce(cardinality(v_ids), 0) > 0 then
    if (select count(*) from public.quiz_questions where id = any(v_ids) and teacher_id = v_uid) <> cardinality(v_ids) then
      raise exception 'Seçilen sorulardan bazıları bulunamadı.';
    end if;
    for q in select * from public.quiz_questions where id = any(v_ids) and teacher_id = v_uid order by array_position(v_ids, id) loop
      v_questions := v_questions || jsonb_build_array(jsonb_build_object(
        'ref', q.id, 'body', q.body, 'choices', to_jsonb(q.choices), 'correct_index', q.correct_index,
        'explanation', q.explanation, 'grade', q.grade, 'subject', q.subject, 'topic', q.topic,
        'image_path', case when q.image_path is null then null
                           when p_dry_run then q.image_path
                           else private.community_map(p_media, 'quiz-images', q.image_path, v_prefix) end
      ));
    end loop;
  end if;

  -- Kişisel veri taraması
  v_findings := private.community_pii(concat_ws(E'\n', p_title, p_description, private.community_text(v_content, v_questions)), v_school);
  if p_dry_run then
    return jsonb_build_object('findings', to_jsonb(v_findings), 'question_count', jsonb_array_length(v_questions),
      'page_count', coalesce(jsonb_array_length(v_content -> 'pages'), 0));
  end if;
  if cardinality(v_findings) > 0 then
    raise exception 'Paylaşılamadı: içerikte kişisel veri olabilir (%). Düzeltip yeniden deneyin.', array_to_string(v_findings, ', ');
  end if;
  if not coalesce(p_confirm, false) then
    raise exception 'Görsellerde ve seslerde öğrenci bilgisi olmadığını onaylayın.';
  end if;
  perform private.check_rate('community_publish', 20, 3600);
  if exists (select 1 from public.community_items where id = p_id) then raise exception 'Bu içerik zaten paylaşılmış.'; end if;

  if v_content is not null then
    v_content := private.community_rewrite_media(v_content, p_media, 'board-images', 'community', v_prefix);
  end if;

  -- Eşlenen dosyaların hepsi depoda olmalı; boyutları toplanır
  select count(*) filter (where o.id is null), coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    into v_missing, v_media_bytes
  from (select distinct value as path from jsonb_each_text(coalesce(p_media, '{}'::jsonb))) m
  left join storage.objects o on o.bucket_id = 'community' and o.name = m.path and left(m.path, char_length(v_prefix)) = v_prefix;
  if v_missing > 0 then raise exception 'Bazı dosyalar yüklenemedi; yeniden deneyin.'; end if;
  if v_media_bytes > 52428800 then raise exception 'Paylaşılan görsel ve seslerin toplamı 50 MB''ı aşamaz.'; end if;

  select nullif(btrim(full_name), '') into v_name from public.profiles where id = v_uid;

  insert into public.community_items (
    id, author_id, author_name, kind, title, description, grade, subject, outcomes, tags,
    content, questions, page_count, question_count, media_bytes, parent_item_id, origin_author, origin_title
  ) values (
    p_id, v_uid, coalesce(v_name, 'Öğretmen'), p_kind, left(btrim(p_title), 120), nullif(left(btrim(coalesce(p_description, '')), 1000), ''),
    nullif(btrim(coalesce(p_grade, '')), ''), nullif(btrim(coalesce(p_subject, '')), ''), v_outcomes,
    coalesce((select array_agg(distinct left(btrim(t), 30)) from unnest(coalesce(p_tags, '{}')) t where btrim(t) <> ''), '{}'),
    v_content, v_questions, coalesce(jsonb_array_length(v_content -> 'pages'), 0), jsonb_array_length(v_questions), v_media_bytes,
    v_parent, v_origin_author, v_origin_title
  );
  return jsonb_build_object('id', p_id);
end;
$$;
revoke all on function public.community_publish(uuid, text, uuid, uuid[], text, text, text, text, text[], text[], jsonb, boolean, boolean) from public, anon;
grant execute on function public.community_publish(uuid, text, uuid, uuid[], text, text, text, text, text[], text[], jsonb, boolean, boolean) to authenticated;

-- Yazar: bilgileri günceller (içerik değişmez)
create or replace function public.community_update(p_id uuid, p_title text, p_description text, p_grade text, p_subject text, p_outcomes text[], p_tags text[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_title, ''))) < 3 then raise exception 'Başlık en az 3 karakter olmalı.'; end if;
  if private.community_pii(concat_ws(E'\n', p_title, p_description), public.my_school_id()) <> '{}' then
    raise exception 'Başlık ya da açıklamada kişisel veri olabilir.';
  end if;
  update public.community_items
     set title = left(btrim(p_title), 120), description = nullif(left(btrim(coalesce(p_description, '')), 1000), ''),
         grade = nullif(btrim(coalesce(p_grade, '')), ''), subject = nullif(btrim(coalesce(p_subject, '')), ''),
         outcomes = private.community_outcomes(p_outcomes),
         tags = coalesce((select array_agg(distinct left(btrim(t), 30)) from unnest(coalesce(p_tags, '{}')) t where btrim(t) <> ''), '{}'),
         updated_at = now()
   where id = p_id and author_id = auth.uid();
  if not found then raise exception 'İçerik bulunamadı.'; end if;
end;
$$;
revoke all on function public.community_update(uuid, text, text, text, text, text[], text[]) from public, anon;
grant execute on function public.community_update(uuid, text, text, text, text, text[], text[]) to authenticated;

-- Yazar: paylaşımı kaldırır (dosyaları istemci siler). Kopyalar etkilenmez.
create or replace function public.community_unpublish(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.community_items where id = p_id and author_id = auth.uid();
  if not found then raise exception 'İçerik bulunamadı.'; end if;
end;
$$;
revoke all on function public.community_unpublish(uuid) from public, anon;
grant execute on function public.community_unpublish(uuid) to authenticated;

-- --------------------------------------------------------
-- Arama: tür, kademe, branş, kazanım kodu (ön ek), metin; sıralama: trend / puan / kullanım / yeni
-- p_scope: all | favorites | mine | featured
-- --------------------------------------------------------
create or replace function public.community_search(
  p_query text default null, p_kind text default null, p_grade text default null, p_subject text default null,
  p_outcome text default null, p_sort text default 'trend', p_scope text default 'all',
  p_limit integer default 24, p_offset integer default 0
)
returns table (
  id uuid, kind text, title text, description text, grade text, subject text, outcomes text[], tags text[],
  author_name text, author_id uuid, page_count integer, question_count integer, rating_avg numeric, rating_count integer,
  copy_count integer, recent_copies integer, featured boolean, hidden boolean, is_mine boolean, is_favorite boolean,
  my_rating smallint, origin_author text, origin_title text, created_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with base as (
    select i.*,
      (select count(*)::integer from public.community_copies c where c.item_id = i.id and c.created_at > now() - interval '14 days') as recent,
      exists (select 1 from public.community_favorites f where f.item_id = i.id and f.teacher_id = auth.uid()) as fav,
      (select r.stars from public.community_ratings r where r.item_id = i.id and r.teacher_id = auth.uid()) as mine_r
    from public.community_items i
    where public.is_staff()
      and (not i.hidden or i.author_id = auth.uid() or public.is_admin())
      and (p_kind is null or i.kind = p_kind)
      and (p_grade is null or i.grade = p_grade)
      and (p_subject is null or i.subject = p_subject)
      and (p_outcome is null or exists (select 1 from unnest(i.outcomes) o where o like upper(btrim(p_outcome)) || '%'))
      and (p_query is null or btrim(p_query) = '' or
           lower(concat_ws(' ', i.title, i.description, i.author_name, array_to_string(i.tags, ' '), array_to_string(i.outcomes, ' '), i.subject, i.grade))
             like '%' || lower(btrim(p_query)) || '%')
      and (p_scope = 'all'
           or (p_scope = 'favorites' and exists (select 1 from public.community_favorites f where f.item_id = i.id and f.teacher_id = auth.uid()))
           or (p_scope = 'mine' and i.author_id = auth.uid())
           or (p_scope = 'featured' and i.featured))
  )
  select b.id, b.kind, b.title, b.description, b.grade, b.subject, b.outcomes, b.tags,
         b.author_name, b.author_id, b.page_count, b.question_count,
         case when b.rating_count > 0 then round(b.rating_sum::numeric / b.rating_count, 1) else null end,
         b.rating_count, b.copy_count, b.recent, b.featured, b.hidden, b.author_id = auth.uid(), b.fav, b.mine_r,
         b.origin_author, b.origin_title, b.created_at
  from base b
  order by
    case when p_sort = 'trend' then b.recent end desc nulls last,
    -- Ağırlıklı puan: az oyla yükselmesin (5 oy ağırlığında 3,5 öncül)
    case when p_sort in ('rating', 'trend') then (b.rating_sum + 17.5) / (b.rating_count + 5) end desc nulls last,
    case when p_sort = 'used' then b.copy_count end desc nulls last,
    case when p_sort <> 'new' then b.featured end desc nulls last,
    b.created_at desc
  limit greatest(1, least(60, p_limit)) offset greatest(0, p_offset);
$$;
revoke all on function public.community_search(text, text, text, text, text, text, text, integer, integer) from public, anon;
grant execute on function public.community_search(text, text, text, text, text, text, text, integer, integer) to authenticated;

-- --------------------------------------------------------
-- Yıldız, favori
-- --------------------------------------------------------
create or replace function public.community_rate(p_item uuid, p_stars integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.'; end if;
  if not exists (select 1 from public.community_items where id = p_item and not hidden) then raise exception 'İçerik bulunamadı.'; end if;
  if exists (select 1 from public.community_items where id = p_item and author_id = auth.uid()) then
    raise exception 'Kendi içeriğinize puan veremezsiniz.';
  end if;
  perform private.check_rate('community_rate', 120, 3600);
  if p_stars is null or p_stars = 0 then
    delete from public.community_ratings where item_id = p_item and teacher_id = auth.uid();
    return;
  end if;
  if p_stars not between 1 and 5 then raise exception 'Puan 1–5 arasında olmalı.'; end if;
  insert into public.community_ratings (item_id, teacher_id, stars) values (p_item, auth.uid(), p_stars)
  on conflict (item_id, teacher_id) do update set stars = excluded.stars, created_at = now();
end;
$$;
revoke all on function public.community_rate(uuid, integer) from public, anon;
grant execute on function public.community_rate(uuid, integer) to authenticated;

create or replace function public.community_favorite(p_item uuid, p_on boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.'; end if;
  if p_on then
    if not exists (select 1 from public.community_items where id = p_item and not hidden) then raise exception 'İçerik bulunamadı.'; end if;
    insert into public.community_favorites (item_id, teacher_id) values (p_item, auth.uid()) on conflict do nothing;
  else
    delete from public.community_favorites where item_id = p_item and teacher_id = auth.uid();
  end if;
end;
$$;
revoke all on function public.community_favorite(uuid, boolean) from public, anon;
grant execute on function public.community_favorite(uuid, boolean) to authenticated;

-- Süper admin: editörün seçimi ve gizleme
create or replace function public.community_moderate(p_item uuid, p_featured boolean, p_hidden boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'Yalnızca yönetici yapabilir.'; end if;
  update public.community_items
     set featured = coalesce(p_featured, featured), hidden = coalesce(p_hidden, hidden), updated_at = now()
   where id = p_item;
  if not found then raise exception 'İçerik bulunamadı.'; end if;
end;
$$;
revoke all on function public.community_moderate(uuid, boolean, boolean) from public, anon;
grant execute on function public.community_moderate(uuid, boolean, boolean) to authenticated;

-- --------------------------------------------------------
-- Kopyalama
-- 1) community_copy_begin: kota kontrolü + yer ayırma; kopyalanacak dosyaların listesi döner
-- 2) istemci dosyaları kendi klasörüne kopyalar (board-images / quiz-images)
-- 3) community_copy_finish: içerik sunucuda kurulur (yollar eşlenir), kopya sayılır, rezervasyon kapanır
--    community_copy_abort: rezervasyon iptal (istemci kopyaladığı dosyaları siler)
-- --------------------------------------------------------
create or replace function public.community_copy_begin(p_item uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  i public.community_items;
  v_id uuid;
begin
  if not public.is_staff() then raise exception 'Yetkiniz yok.'; end if;
  select * into i from public.community_items where id = p_item and not hidden;
  if not found then raise exception 'İçerik bulunamadı.'; end if;
  perform private.check_rate('community_copy', 30, 3600);
  -- Aynı anda başlayan kopyalamalar kotayı birlikte aşmasın
  perform pg_advisory_xact_lock(hashtext('media_quota:' || auth.uid()::text));
  delete from private.community_reservations where expires_at <= now();
  if private.teacher_media_used(auth.uid()) + i.media_bytes > public.teacher_file_quota() then
    raise exception 'Depolama alanınız yetmiyor (500 MB). Bu içerik % MB yer istiyor; kullanmadığınız dosya ve görselleri silip yeniden deneyin.',
      round(i.media_bytes / 1048576.0, 1);
  end if;
  insert into private.community_reservations (teacher_id, item_id, bytes) values (auth.uid(), i.id, i.media_bytes) returning id into v_id;
  return jsonb_build_object('reservation', v_id, 'board_files',
    (select coalesce(jsonb_agg(distinct v #>> '{}'), '[]'::jsonb) from (
      select v from jsonb_path_query(coalesce(i.content, '{}'::jsonb), '$.pages[*].elements[*] ? (@.type == "image").path') v
      union select v from jsonb_path_query(coalesce(i.content, '{}'::jsonb), '$.pages[*].elements[*].data.audio.path') v
    ) y),
    'question_files', (select coalesce(jsonb_agg(distinct v #>> '{}'), '[]'::jsonb) from jsonb_path_query(i.questions, '$[*].image_path') v where v <> 'null'::jsonb),
    'bytes', i.media_bytes);
end;
$$;
revoke all on function public.community_copy_begin(uuid) from public, anon;
grant execute on function public.community_copy_begin(uuid) to authenticated;

create or replace function public.community_copy_abort(p_reservation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.community_reservations where id = p_reservation and teacher_id = auth.uid();
$$;
revoke all on function public.community_copy_abort(uuid) from public, anon;
grant execute on function public.community_copy_abort(uuid) to authenticated;

-- p_map: "community/<yol>" → yeni yol (board-images ya da quiz-images içinde, <öğretmen>/ ile başlar)
create or replace function public.community_copy_finish(p_reservation uuid, p_map jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r private.community_reservations;
  i public.community_items;
  v_prefix text := auth.uid()::text || '/';
  v_school uuid := public.my_school_id();
  v_refmap jsonb := '{}'::jsonb;
  v_q jsonb;
  v_new uuid;
  v_content jsonb;
  v_board uuid;
  v_pages jsonb;
  v_out jsonb := '[]'::jsonb;
  v_els jsonb;
  v_el jsonb;
  v_new_els jsonb;
  v_count integer := 0;
begin
  select * into r from private.community_reservations where id = p_reservation and teacher_id = auth.uid() and expires_at > now() for update;
  if not found then raise exception 'Kopyalama süresi doldu; yeniden deneyin.'; end if;
  select * into i from public.community_items where id = r.item_id;
  if not found then raise exception 'İçerik artık paylaşımda değil.'; end if;

  -- Sorular kopyalayanın bankasına eklenir (kaynak etiketiyle)
  for v_q in select * from jsonb_array_elements(i.questions) loop
    insert into public.quiz_questions (teacher_id, school_id, body, image_path, choices, correct_index, explanation, grade, subject, topic, tags)
    values (
      auth.uid(), v_school, v_q ->> 'body',
      case when v_q ->> 'image_path' is null then null else private.community_map(p_map, 'community', v_q ->> 'image_path', v_prefix) end,
      array(select jsonb_array_elements_text(v_q -> 'choices')), (v_q ->> 'correct_index')::smallint, v_q ->> 'explanation',
      v_q ->> 'grade', v_q ->> 'subject', v_q ->> 'topic', array['Topluluk']
    ) returning id into v_new;
    v_refmap := v_refmap || jsonb_build_object(v_q ->> 'ref', v_new);
    v_count := v_count + 1;
  end loop;

  if i.kind = 'board' then
    v_content := private.community_rewrite_media(i.content, p_map, 'community', 'board-images', v_prefix);
    -- Mini Test parçaları yeni sorulara bağlanır
    v_pages := v_content -> 'pages';
    for a in 0 .. jsonb_array_length(v_pages) - 1 loop
      v_els := coalesce(v_pages -> a -> 'elements', '[]'::jsonb);
      v_new_els := '[]'::jsonb;
      for b in 0 .. jsonb_array_length(v_els) - 1 loop
        v_el := v_els -> b;
        if v_el ->> 'type' = 'widget' and v_el ->> 'kind' = 'minitest' and v_el #>> '{data,questionId}' is not null then
          v_el := jsonb_set(v_el, '{data,questionId}', coalesce(v_refmap -> (v_el #>> '{data,questionId}'), 'null'::jsonb));
        end if;
        v_new_els := v_new_els || jsonb_build_array(v_el);
      end loop;
      v_out := v_out || jsonb_build_array(jsonb_set(v_pages -> a, '{elements}', v_new_els));
    end loop;
    v_content := jsonb_set(v_content, '{pages}', v_out);
    insert into public.boards (teacher_id, school_id, title, subject, grade, content)
    values (auth.uid(), v_school, i.title, i.subject, i.grade, v_content)
    returning id into v_board;
    insert into public.board_sources (board_id, item_id, author_name, title) values (v_board, i.id, i.author_name, i.title);
  end if;

  update public.community_items set copy_count = copy_count + 1 where id = i.id;
  insert into public.community_copies (item_id, teacher_id) values (i.id, auth.uid());
  delete from private.community_reservations where id = r.id;
  return jsonb_build_object('board_id', v_board, 'question_count', v_count);
end;
$$;
revoke all on function public.community_copy_finish(uuid, jsonb) from public, anon;
grant execute on function public.community_copy_finish(uuid, jsonb) to authenticated;
