-- ========================================================
-- DUYURULAR OKULA GÖRE AYRILIR
--  Önceki durum: her öğretmen/öğrenci bütün okulların duyurularını görüyordu,
--  her öğretmen başkasının duyurusunu silebiliyordu, yazar adı tarayıcıdan geliyordu.
--
--  Yeni kurallar:
--   - Öğretmen duyurusu her zaman kendi okuluna gider (school_id sunucuda atanır).
--   - Süper admin "bütün okullar" (school_id = null) ya da tek bir okul seçer.
--   - Okuma: kendi okulunun duyuruları + bütün okullara olanlar; admin hepsini görür.
--   - Silme: öğretmen yalnızca kendi duyurusunu, admin hepsini.
--   - Yazar ve yazar adı sunucuda atanır; duyuru sonradan düzenlenemez (sil + yeniden yayınla).
-- ========================================================

alter table public.announcements
  add column if not exists author_id uuid references public.profiles(id) on delete set null,
  add column if not exists school_id uuid references public.schools(id) on delete cascade;

create index if not exists announcements_school_time_idx on public.announcements (school_id, created_at desc);

-- --------------------------------------------------------
-- Yazar, yazar adı ve okul sunucuda atanır
-- --------------------------------------------------------
create or replace function public.announcements_set_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles%rowtype;
begin
  select * into v_profile from public.profiles where id = auth.uid();
  if not found or not v_profile.approved or not v_profile.is_active then
    raise exception 'Duyuru yayınlama yetkiniz yok.' using errcode = '42501';
  end if;

  new.author_id := v_profile.id;
  if v_profile.role = 'admin' then
    new.teacher_name := 'Okul Yönetimi';
    -- Admin: school_id null = bütün okullar; dolu ise o okul (var olmalı)
    if new.school_id is not null and not exists (select 1 from public.schools s where s.id = new.school_id) then
      raise exception 'Seçilen okul bulunamadı.';
    end if;
  else
    new.teacher_name := coalesce(nullif(trim(v_profile.full_name), ''), 'Öğretmen');
    new.school_id := v_profile.school_id;
    if new.school_id is null then
      raise exception 'Duyuru yayınlamak için hesabınızın bir okula bağlı olması gerekir.';
    end if;
  end if;

  new.title := left(trim(new.title), 200);
  new.content := left(trim(new.content), 4000);
  if new.priority not in ('normal', 'urgent') then
    new.priority := 'normal';
  end if;
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists announcements_set_author on public.announcements;
create trigger announcements_set_author
  before insert on public.announcements
  for each row execute function public.announcements_set_author();

-- --------------------------------------------------------
-- Okuma yetkisi
-- --------------------------------------------------------
create or replace function public.can_read_announcement(p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_admin() then true
    when p_school_id is null then public.is_staff() or public.current_student_id() is not null
    when public.is_staff() then p_school_id = public.my_school_id()
    else exists (
      select 1 from public.students s
      where s.id = public.current_student_id() and s.school_id = p_school_id
    )
  end;
$$;

-- --------------------------------------------------------
-- Politikalar ve yetkiler
-- --------------------------------------------------------
drop policy if exists announcements_select on public.announcements;
drop policy if exists announcements_staff_write on public.announcements;
drop policy if exists announcements_insert on public.announcements;
drop policy if exists announcements_delete on public.announcements;

create policy announcements_select on public.announcements for select to authenticated
  using ((select public.can_read_announcement(school_id)));

-- Yazar/okul trigger'da atanır; burada yalnızca personel olma şartı
create policy announcements_insert on public.announcements for insert to authenticated
  with check ((select public.is_staff()));

create policy announcements_delete on public.announcements for delete to authenticated
  using ((select public.is_admin()) or (author_id = (select auth.uid()) and (select public.is_staff())));

-- Düzenleme kapalı: duyuru sonradan değiştirilemez
revoke all on public.announcements from anon;
revoke update, truncate, references, trigger on public.announcements from authenticated;
grant select, insert, delete on public.announcements to authenticated;
