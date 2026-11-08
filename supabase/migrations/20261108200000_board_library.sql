-- ========================================================
-- TAHTA ŞEKİL KÜTÜPHANESİ: öğretmenin kendi parçaları (EduBoard paket 7b)
-- - board_library_items: öğretmenin tahtadan kaydettiği öğe grupları ("Kütüphaneme kaydet")
--   elements: tahta öğeleri dizisi (BoardEl[]), (0,0) başlangıçlı; en fazla 200 KB, 300 öğe
-- - visibility: 'private' (yalnızca sahibi) | 'school' (aynı okuldaki öğretmenler görür, değiştiremez)
-- - Resim öğeleri ve soru bankasına bağlı parçalar (Mini Test, Cevabı Göster) kaydedilemez:
--   sahibinin özel dosyalarına/sorularına bağlıdırlar, başkasında açılmazlar.
-- - Öğretmen başına en fazla 200 kayıt.
-- ========================================================

create table if not exists public.board_library_items (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  category text not null default 'diger' check (category in ('matematik', 'fen', 'genel', 'diger')),
  elements jsonb not null check (jsonb_typeof(elements) = 'array' and octet_length(elements::text) <= 204800),
  visibility text not null default 'private' check (visibility in ('private', 'school')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists board_library_items_teacher_idx on public.board_library_items (teacher_id, updated_at desc);
create index if not exists board_library_items_school_idx on public.board_library_items (school_id, updated_at desc) where visibility = 'school';
alter table public.board_library_items enable row level security;

create or replace function public.board_library_items_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
  v_el jsonb;
begin
  if tg_op = 'INSERT' then
    if not public.is_staff() then raise exception 'Yalnızca öğretmenler kütüphaneye kaydedebilir.'; end if;
    new.teacher_id := auth.uid();
    new.school_id := public.my_school_id();
    new.created_at := now();
    select count(*) into v_count from public.board_library_items where teacher_id = new.teacher_id;
    if v_count >= 200 then raise exception 'Kütüphanenizde en fazla 200 şekil olabilir. Kullanmadıklarınızı silin.'; end if;
  elsif new.teacher_id is distinct from old.teacher_id or new.school_id is distinct from old.school_id then
    raise exception 'Bu alan değiştirilemez.';
  end if;

  new.name := btrim(new.name);
  if jsonb_array_length(new.elements) = 0 then raise exception 'Kaydedilecek öğe yok.'; end if;
  if jsonb_array_length(new.elements) > 300 then raise exception 'Bir şekil en fazla 300 öğeden oluşabilir.'; end if;
  for v_el in select * from jsonb_array_elements(new.elements) loop
    if jsonb_typeof(v_el) is distinct from 'object' or jsonb_typeof(v_el -> 'type') is distinct from 'string' then
      raise exception 'Şekil içeriği geçersiz.';
    end if;
    if v_el ->> 'type' = 'image' then
      raise exception 'Resimler kütüphaneye kaydedilemez; resmi seçimden çıkarın.';
    end if;
    if v_el ->> 'type' = 'widget' and v_el ->> 'kind' in ('minitest', 'reveal') then
      raise exception 'Mini Test ve Cevabı Göster parçaları kütüphaneye kaydedilemez.';
    end if;
  end loop;
  if new.visibility = 'school' and new.school_id is null then
    raise exception 'Okulunuz tanımlı olmadığı için şekil okulla paylaşılamaz.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.board_library_items_guard() from public, anon, authenticated;
drop trigger if exists board_library_items_guard on public.board_library_items;
create trigger board_library_items_guard before insert or update on public.board_library_items
  for each row execute function public.board_library_items_guard();

-- Sahibi: her şeyi yapar
drop policy if exists board_library_items_own on public.board_library_items;
create policy board_library_items_own on public.board_library_items for all to authenticated
  using (teacher_id = (select auth.uid()) and (select public.is_staff()))
  with check (teacher_id = (select auth.uid()) and (select public.is_staff()));

-- Aynı okuldaki öğretmenler: okulla paylaşılanları yalnızca görür
drop policy if exists board_library_items_school_select on public.board_library_items;
create policy board_library_items_school_select on public.board_library_items for select to authenticated
  using (
    visibility = 'school'
    and school_id is not null
    and school_id = (select public.my_school_id())
    and (select public.is_staff())
  );

revoke all on public.board_library_items from anon;
grant select, insert, update, delete on public.board_library_items to authenticated;
