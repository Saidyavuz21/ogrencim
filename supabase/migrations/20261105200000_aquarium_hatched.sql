-- ========================================================
-- SINIF AKVARYUMU: "yumurtadan çıktı" bilgisi
-- Öğrenci 5 puana ulaştığında balık olur ve bir daha yumurtaya dönmez.
-- Puan sonradan düşse de hatched = true kalır (yalnızca balığın boyu küçülür).
-- ========================================================

alter table public.students add column if not exists hatched boolean not null default false;

-- Puan 5'e ulaştığında kalıcı olarak işaretle (staff_give_points ve diğer tüm güncellemeler için)
create or replace function public.students_mark_hatched()
returns trigger language plpgsql set search_path = '' as $$
begin
  if coalesce(new.points, 0) >= 5 then
    new.hatched := true;
  end if;
  -- Bir kez çıkan balık geri yumurtaya dönmez
  if tg_op = 'UPDATE' and old.hatched then
    new.hatched := true;
  end if;
  return new;
end;
$$;

drop trigger if exists students_mark_hatched on public.students;
create trigger students_mark_hatched
  before insert or update on public.students
  for each row execute function public.students_mark_hatched();

-- Mevcut öğrenciler: şu anki puanı veya geçmişte ulaştığı en yüksek ara toplam 5 ve üzeriyse
update public.students s
   set hatched = true
 where not s.hatched
   and (
     coalesce(s.points, 0) >= 5
     or exists (
       select 1
         from (
           select sum(h.amount) over (order by h.created_at, h.id) as running
             from public.points_history h
            where h.student_id = s.id
         ) x
        where x.running >= 5
     )
   );

-- Sınıf sıralaması artık hatched bilgisini de döndürür (dönüş tipi değiştiği için önce kaldırılır)
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
  minus_count integer,
  hatched boolean
)
language sql stable security definer set search_path = '' as $$
  select s.id, s.student_number, s.name, s.class_name, s.avatar, s.points, s.plus_count, s.minus_count, s.hatched
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
