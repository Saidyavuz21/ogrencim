-- ========================================================
-- SINIF AKVARYUMU: kural değişikliği
-- Balık / yumurta artık yalnızca şu anki puana göre belirlenir:
-- 5 ve üzeri balık, 5'in altı yumurta (puan düşerse yeniden yumurta olur).
-- Bu yüzden "yumurtadan çıktı" (hatched) bilgisi ve tetikleyicisi kaldırılır.
-- Uygulama bu alanı artık okumadığı için bu dosya istenen zamanda çalıştırılabilir.
-- ========================================================

-- class_leaderboard hatched sütununu döndürüyordu: önce eski haline (hatched olmadan) getirilir
drop function if exists public.class_leaderboard();
create function public.class_leaderboard()
returns table (
  id uuid,
  student_number text,
  name text,
  class_name text,
  avatar text,
  points integer,
  plus_count integer,
  minus_count integer
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.student_number, s.name, s.class_name, s.avatar, s.points, s.plus_count, s.minus_count
  from public.students s
  where public.is_admin()
     or (public.is_staff() and s.school_id is not distinct from public.my_school_id())
     or exists (
       select 1 from public.students me
       where me.id = public.current_student_id()
         and me.class_name = s.class_name
         and me.school_id is not distinct from s.school_id
     )
  order by s.points desc, s.name;
$$;
revoke execute on function public.class_leaderboard() from public, anon;
grant execute on function public.class_leaderboard() to authenticated;

drop trigger if exists students_mark_hatched on public.students;
drop function if exists public.students_mark_hatched();
alter table public.students drop column if exists hatched;
