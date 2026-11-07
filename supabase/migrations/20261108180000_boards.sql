-- ========================================================
-- ETKİLEŞİMLİ TAHTA (EduBoard paket 7)
-- - boards: öğretmenin düzenlediği tahta (sayfalar, çizimler, şekiller, notlar, görseller, parçalar)
--   Sabit sanal çözünürlük 1920×1080; içerik en fazla 5 MB
-- - Ödev olarak gönderilince tahtanın o anki kopyası homework_boards'a dondurulur.
--   Mini Test parçaları quiz motoruna soru olarak eklenir (doğru cevap öğrenciye gitmez),
--   ödev "alıştırma" kurallarıyla puanlanır ve Ödev kontrolü'ne işlenir.
-- - board_drawings: öğrencinin kendi çizim katmanı (en fazla 2 MB), yalnızca sunucu fonksiyonuyla kaydedilir;
--   ödev kapanınca ya da teslim tarihi geçince değiştirilemez
-- - quiz_reveal: "Cevabı Göster" (alıştırmada; sınav modunda sunucuda kapalı), o sorudan puan alınmaz
-- - board-images: tahta görselleri (öğretmenin klasörü)
-- ========================================================

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  subject text check (subject is null or char_length(subject) <= 80),
  grade text check (grade is null or char_length(grade) <= 30),
  content jsonb not null default '{"pages": []}'::jsonb check (octet_length(content::text) <= 5242880),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists boards_teacher_idx on public.boards (teacher_id, updated_at desc);
alter table public.boards enable row level security;

create or replace function public.boards_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if not public.is_staff() then raise exception 'Yalnızca öğretmenler tahta oluşturabilir.'; end if;
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
    new.created_at := now();
  elsif new.teacher_id is distinct from old.teacher_id or new.school_id is distinct from old.school_id then
    raise exception 'Bu alan değiştirilemez.';
  end if;
  new.title := btrim(new.title);
  new.subject := nullif(btrim(coalesce(new.subject, '')), '');
  new.grade := nullif(btrim(coalesce(new.grade, '')), '');
  if jsonb_typeof(new.content -> 'pages') is distinct from 'array' then
    raise exception 'Tahta içeriği geçersiz.';
  end if;
  if jsonb_array_length(new.content -> 'pages') > 50 then
    raise exception 'Bir tahtada en fazla 50 sayfa olabilir.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.boards_guard() from public, anon, authenticated;
drop trigger if exists boards_guard on public.boards;
create trigger boards_guard before insert or update on public.boards
  for each row execute function public.boards_guard();

drop policy if exists boards_own on public.boards;
create policy boards_own on public.boards for all to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()))
  with check (teacher_id = (select auth.uid()) and (select public.is_staff()));
revoke all on public.boards from anon;
grant select, insert, update, delete on public.boards to authenticated;

-- --------------------------------------------------------
-- Ödeve gönderilen tahta (dondurulmuş kopya)
-- --------------------------------------------------------
alter table public.homeworks add column if not exists has_board boolean not null default false;

create table if not exists public.homework_boards (
  homework_id uuid primary key references public.homeworks(id) on delete cascade,
  source_board_id uuid references public.boards(id) on delete set null,
  title text not null default '',
  content jsonb not null check (octet_length(content::text) <= 5242880),
  created_at timestamptz not null default now()
);
alter table public.homework_boards enable row level security;
drop policy if exists homework_boards_select on public.homework_boards;
create policy homework_boards_select on public.homework_boards for select to authenticated
  using ((select public.owns_homework(homework_id)) or (select public.student_has_homework(homework_id)));
revoke all on public.homework_boards from anon;
grant select on public.homework_boards to authenticated;

-- Öğretmen: tahtayı ödeve bağlar. Mini Test parçalarındaki bankadan sorular quiz sorusu olarak
-- dondurulur; parçada yalnızca quiz sorusunun kimliği kalır (doğru cevap içerikte yok).
create or replace function public.board_publish(p_hw uuid, p_board uuid, p_content jsonb)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  h public.homeworks;
  b public.boards;
  v_pages jsonb;
  v_page jsonb;
  v_els jsonb;
  v_el jsonb;
  v_new_pages jsonb := '[]'::jsonb;
  v_new_els jsonb;
  v_item uuid;
  v_pos integer := 0;
  v_qid uuid;
begin
  select * into h from public.homeworks where id = p_hw;
  if not found or h.teacher_id is distinct from auth.uid() or not public.is_staff() then
    raise exception 'Ödev bulunamadı.';
  end if;
  select * into b from public.boards where id = p_board and teacher_id = auth.uid();
  if not found then raise exception 'Tahta bulunamadı.'; end if;
  if exists (select 1 from public.homework_boards where homework_id = p_hw) then
    raise exception 'Bu ödeve zaten tahta bağlı.';
  end if;
  if octet_length(p_content::text) > 5242880 then raise exception 'Tahta 5 MB sınırını aşıyor.'; end if;
  v_pages := p_content -> 'pages';
  if jsonb_typeof(v_pages) is distinct from 'array' or jsonb_array_length(v_pages) = 0 then
    raise exception 'Tahtada en az bir sayfa olmalı.';
  end if;
  if exists (select 1 from public.quiz_items where homework_id = p_hw) then
    raise exception 'Bu ödevin soruları zaten var.';
  end if;

  for i in 0 .. jsonb_array_length(v_pages) - 1 loop
    v_page := v_pages -> i;
    v_els := coalesce(v_page -> 'elements', '[]'::jsonb);
    v_new_els := '[]'::jsonb;
    for j in 0 .. jsonb_array_length(v_els) - 1 loop
      v_el := v_els -> j;
      if v_el ->> 'type' = 'widget' and v_el ->> 'kind' = 'minitest' then
        v_qid := nullif(v_el -> 'data' ->> 'questionId', '')::uuid;
        v_item := null;
        if v_qid is not null then
          insert into public.quiz_items (homework_id, position, source_question_id, body, image_path, choices, correct_index, explanation)
          select p_hw, v_pos, q.id, q.body, q.image_path, q.choices, q.correct_index, q.explanation
          from public.quiz_questions q where q.id = v_qid and q.teacher_id = auth.uid()
          returning id into v_item;
        end if;
        if v_item is null then
          raise exception 'Mini Test sorusu bulunamadı (sayfa %).', i + 1;
        end if;
        v_pos := v_pos + 1;
        v_el := jsonb_set(v_el, '{data}', ((v_el -> 'data') - 'questionId') || jsonb_build_object('itemId', v_item));
      end if;
      v_new_els := v_new_els || jsonb_build_array(v_el);
    end loop;
    v_new_pages := v_new_pages || jsonb_build_array(jsonb_set(v_page, '{elements}', v_new_els));
  end loop;

  insert into public.homework_boards (homework_id, source_board_id, title, content)
  values (p_hw, p_board, b.title, jsonb_set(p_content, '{pages}', v_new_pages));

  update public.homeworks
     set has_board = true,
         quiz_mode = case when v_pos > 0 then 'practice' else quiz_mode end
   where id = p_hw;
  return v_pos;
end;
$$;
revoke execute on function public.board_publish(uuid, uuid, jsonb) from public, anon;
grant execute on function public.board_publish(uuid, uuid, jsonb) to authenticated;

-- --------------------------------------------------------
-- Öğrencinin çizim katmanı
-- --------------------------------------------------------
create table if not exists public.board_drawings (
  homework_id uuid not null references public.homeworks(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  pages jsonb not null default '{}'::jsonb check (octet_length(pages::text) <= 2097152),
  updated_at timestamptz not null default now(),
  primary key (homework_id, student_id)
);
alter table public.board_drawings enable row level security;
drop policy if exists board_drawings_select on public.board_drawings;
create policy board_drawings_select on public.board_drawings for select to authenticated
  using (student_id = (select public.current_student_id()) or (select public.owns_homework(homework_id)));
revoke all on public.board_drawings from anon;
grant select on public.board_drawings to authenticated;

-- Öğrenci: çizimini kaydeder (otomatik kayıt); ödev kapalıysa ya da süresi geçtiyse reddedilir
create or replace function public.save_board_drawing(p_hw uuid, p_pages jsonb)
returns timestamptz language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  h public.homeworks;
  v_at timestamptz := now();
begin
  if v_student is null or not public.student_has_homework(p_hw) then raise exception 'Ödev bulunamadı.'; end if;
  select * into h from public.homeworks where id = p_hw;
  if not h.has_board then raise exception 'Bu ödevde tahta yok.'; end if;
  if h.closed_at is not null or (h.due_at is not null and h.due_at <= now()) then
    raise exception 'Ödevin süresi doldu; çizim artık değiştirilemez.';
  end if;
  if jsonb_typeof(p_pages) is distinct from 'object' then raise exception 'Çizim geçersiz.'; end if;
  if octet_length(p_pages::text) > 2097152 then raise exception 'Çizim 2 MB sınırını aşıyor. Bazı çizgileri silip yeniden dene.'; end if;
  insert into public.board_drawings (homework_id, student_id, pages, updated_at)
  values (p_hw, v_student, p_pages, v_at)
  on conflict (homework_id, student_id) do update set pages = excluded.pages, updated_at = excluded.updated_at;
  return v_at;
end;
$$;
revoke execute on function public.save_board_drawing(uuid, jsonb) from public, anon;
grant execute on function public.save_board_drawing(uuid, jsonb) to authenticated;

-- --------------------------------------------------------
-- "Cevabı Göster": alıştırmada doğru cevabı açar, soru çözülmüş sayılır ve puan almaz.
-- Sınav modunda sunucuda kapalıdır.
-- --------------------------------------------------------
create or replace function public.quiz_reveal(p_hw uuid, p_item uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_student uuid := public.current_student_id();
  h public.homeworks;
  i public.quiz_items;
  v_unresolved integer;
begin
  if v_student is null or not public.student_has_homework(p_hw) then raise exception 'Quiz bulunamadı.'; end if;
  select * into h from public.homeworks where id = p_hw;
  if h.quiz_mode is distinct from 'practice' then
    raise exception 'Sınav modunda cevap gösterilemez.';
  end if;
  select * into i from public.quiz_items where id = p_item and homework_id = p_hw;
  if not found then raise exception 'Bu soru bu ödeve ait değil.'; end if;

  if public.quiz_is_open(h) then
    insert into public.quiz_attempts (homework_id, student_id, item_count)
    values (p_hw, v_student, (select count(*) from public.quiz_items where homework_id = p_hw))
    on conflict (homework_id, student_id) do nothing;
    if not exists (select 1 from public.quiz_attempts where homework_id = p_hw and student_id = v_student and finished_at is not null) then
      insert into public.quiz_answers (homework_id, student_id, item_id) values (p_hw, v_student, p_item)
      on conflict do nothing;
      -- Doğru çözülmüş soru bozulmaz; çözülmemişse "deneme hakkı bitti", puan 0
      update public.quiz_answers set tries = 3, last_try_at = now()
       where homework_id = p_hw and student_id = v_student and item_id = p_item and not correct;
      perform public.quiz_recalc(p_hw, v_student);
      select count(*) into v_unresolved
      from public.quiz_items qi
      left join public.quiz_answers qa on qa.item_id = qi.id and qa.student_id = v_student
      where qi.homework_id = p_hw and not (coalesce(qa.correct, false) or coalesce(qa.tries, 0) >= 3);
      if v_unresolved = 0 then
        update public.quiz_attempts set finished_at = now() where homework_id = p_hw and student_id = v_student and finished_at is null;
        perform public.quiz_write_check(p_hw, v_student);
      end if;
    end if;
  end if;
  return jsonb_build_object('correct_index', i.correct_index, 'explanation', i.explanation);
end;
$$;
revoke execute on function public.quiz_reveal(uuid, uuid) from public, anon;
grant execute on function public.quiz_reveal(uuid, uuid) to authenticated;

-- --------------------------------------------------------
-- Tahta görselleri
-- --------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('board-images', 'board-images', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists board_images_insert on storage.objects;
create policy board_images_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text and (select public.is_staff()));
drop policy if exists board_images_select on storage.objects;
create policy board_images_select on storage.objects for select to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists board_images_delete on storage.objects;
create policy board_images_delete on storage.objects for delete to authenticated
  using (bucket_id = 'board-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
