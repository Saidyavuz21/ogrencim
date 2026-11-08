-- ========================================================
-- Okulla paylaşılan tahta şekilleri + paylaşan öğretmenin adı
-- profiles tablosu öğretmenlerin birbirini okumasına izin vermez (doğru); bu fonksiyon
-- yalnızca aynı okulda 'school' olarak paylaşılmış kayıtları ve paylaşanın ad-soyadını döndürür.
-- Kendi kayıtları dahil değildir (onlar board_library_items'tan doğrudan okunur).
-- ========================================================

create or replace function public.board_library_school_items()
returns table (
  id uuid,
  name text,
  category text,
  elements jsonb,
  updated_at timestamptz,
  author_name text
)
language sql stable security definer set search_path = '' as $$
  select i.id, i.name, i.category, i.elements, i.updated_at,
         coalesce(nullif(btrim(p.full_name), ''), 'Öğretmen') as author_name
  from public.board_library_items i
  left join public.profiles p on p.id = i.teacher_id
  where public.is_staff()
    and i.visibility = 'school'
    and i.school_id is not null
    and i.school_id = public.my_school_id()
    and i.teacher_id is distinct from auth.uid()
  order by i.updated_at desc
  limit 500;
$$;
revoke execute on function public.board_library_school_items() from public, anon;
grant execute on function public.board_library_school_items() to authenticated;
