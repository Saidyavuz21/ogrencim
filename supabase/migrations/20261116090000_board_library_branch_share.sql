-- ========================================================
-- Tahta şekilleri: "Zümrem" paylaşımı
-- visibility: 'private' | 'school' (tüm okul) | 'branch' (aynı okulda, aynı branştaki öğretmenler)
-- Branş, kaydı yazan öğretmenin profilinden alınır (istemci gönderemez).
-- Karşılaştırma büyük/küçük harf ve baştaki/sondaki boşluklardan bağımsızdır.
-- ========================================================

alter table public.board_library_items add column if not exists branch text;

alter table public.board_library_items drop constraint if exists board_library_items_visibility_check;
alter table public.board_library_items add constraint board_library_items_visibility_check
  check (visibility in ('private', 'school', 'branch'));

create index if not exists board_library_items_branch_idx
  on public.board_library_items (school_id, branch, updated_at desc) where visibility = 'branch';

-- Giriş yapan öğretmenin normalleştirilmiş branşı (yoksa null)
create or replace function public.my_branch()
returns text language sql stable security definer set search_path = '' as $$
  select nullif(lower(btrim(p.branch)), '') from public.profiles p where p.id = auth.uid();
$$;
revoke execute on function public.my_branch() from public, anon;
grant execute on function public.my_branch() to authenticated;

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

  -- Branş her yazımda sahibinin güncel profilinden gelir
  new.branch := public.my_branch();

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
  if new.visibility in ('school', 'branch') and new.school_id is null then
    raise exception 'Okulunuz tanımlı olmadığı için şekil paylaşılamaz.';
  end if;
  if new.visibility = 'branch' and new.branch is null then
    raise exception 'Profilinizde branş tanımlı olmadığı için zümreyle paylaşılamaz.';
  end if;
  new.updated_at := now();
  return new;
end;
$$;
revoke execute on function public.board_library_items_guard() from public, anon, authenticated;

-- Okul / zümre paylaşımlarını görme
drop policy if exists board_library_items_school_select on public.board_library_items;
create policy board_library_items_school_select on public.board_library_items for select to authenticated
  using (
    school_id is not null
    and school_id = (select public.my_school_id())
    and (select public.is_staff())
    and (
      visibility = 'school'
      or (visibility = 'branch' and branch is not null and branch = (select public.my_branch()))
    )
  );

-- Paylaşılanlar listesi: dönüş tipine visibility eklendiği için yeniden oluşturulur
drop function if exists public.board_library_school_items();
create function public.board_library_school_items()
returns table (
  id uuid,
  name text,
  category text,
  elements jsonb,
  updated_at timestamptz,
  author_name text,
  visibility text
)
language sql stable security definer set search_path = '' as $$
  select i.id, i.name, i.category, i.elements, i.updated_at,
         coalesce(nullif(btrim(p.full_name), ''), 'Öğretmen') as author_name,
         i.visibility
  from public.board_library_items i
  left join public.profiles p on p.id = i.teacher_id
  where public.is_staff()
    and i.school_id is not null
    and i.school_id = public.my_school_id()
    and i.teacher_id is distinct from auth.uid()
    and (
      i.visibility = 'school'
      or (i.visibility = 'branch' and i.branch is not null and i.branch = public.my_branch())
    )
  order by i.updated_at desc
  limit 500;
$$;
revoke execute on function public.board_library_school_items() from public, anon;
grant execute on function public.board_library_school_items() to authenticated;
