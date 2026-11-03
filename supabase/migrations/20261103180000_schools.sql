-- ========================================================
-- OKULLAR: İl → İlçe → Okul seçimi
-- ========================================================
-- * Öğretmen kayıtta listeden okul seçer; yoksa adını yazar → okul "pending" (onay bekliyor) eklenir.
-- * Admin bekleyen okulu onaylar, mevcut bir okulla birleştirir (yazım farkı) veya siler.
-- * Admin toplu/tekil okul ekleyebilir.
-- * profiles.school_id ileride "öğretmen yalnız kendi okulunu görür" kuralının temelidir (Aşama 2).
-- ========================================================

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 3 and 160),
  city text not null,
  district text not null,
  status text not null default 'approved' check (status in ('approved', 'pending')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Aynı il/ilçede aynı ad (büyük-küçük harf ve boşluk farkı gözetmeden) tek olsun
create unique index if not exists schools_unique_name
  on public.schools (city, district, lower(regexp_replace(trim(name), '\s+', ' ', 'g')));
create index if not exists schools_city_district on public.schools (city, district) where status = 'approved';

alter table public.schools enable row level security;

alter table public.profiles add column if not exists school_id uuid references public.schools(id) on delete set null;

-- --------------------------------------------------------
-- KAYIT: metadata'daki school_id veya new_school_name ile okulu bağla
-- --------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_city text := left(v_meta ->> 'city', 80);
  v_district text := left(v_meta ->> 'district', 80);
  v_school_id uuid;
  v_school_name text;
  v_new_name text := nullif(left(regexp_replace(trim(coalesce(v_meta ->> 'new_school_name', '')), '\s+', ' ', 'g'), 160), '');
begin
  if coalesce(new.is_anonymous, false) then
    return new;
  end if;

  -- 1) Listeden seçilmiş onaylı okul
  if (v_meta ->> 'school_id') ~ '^[0-9a-fA-F-]{36}$' then
    select id, name into v_school_id, v_school_name
    from public.schools
    where id = (v_meta ->> 'school_id')::uuid and status = 'approved';
  end if;

  -- 2) "Okulum listede yok": aynı ilçede aynı adla varsa onu kullan, yoksa onay bekleyen okul ekle
  if v_school_id is null and v_new_name is not null and char_length(v_new_name) >= 3
     and v_city is not null and v_district is not null then
    select id, name into v_school_id, v_school_name
    from public.schools
    where city = v_city and district = v_district
      and lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower(v_new_name);

    if v_school_id is null then
      insert into public.schools (name, city, district, status, created_by)
      values (v_new_name, v_city, v_district, 'pending', new.id)
      returning id, name into v_school_id, v_school_name;
    end if;
  end if;

  insert into public.profiles (id, role, full_name, email, branch, city, district, school_id, school_name, class_name, approved)
  values (
    new.id,
    'ogretmen',
    left(coalesce(v_meta ->> 'name', ''), 120),
    new.email,
    left(v_meta ->> 'branch', 80),
    v_city,
    v_district,
    v_school_id,
    coalesce(v_school_name, left(v_meta ->> 'school', 160)),
    left(v_meta ->> 'class_name', 20),
    false
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- --------------------------------------------------------
-- ADMIN İŞLEMLERİ
-- --------------------------------------------------------
-- Okul ekle (onaylı). Aynı ilçede aynı ad varsa onu döner.
create or replace function public.admin_add_school(p_name text, p_city text, p_district text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_name text := regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g');
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if char_length(v_name) < 3 or coalesce(p_city, '') = '' or coalesce(p_district, '') = '' then
    raise exception 'Okul adı (en az 3 karakter), il ve ilçe zorunludur.';
  end if;

  select id into v_id from public.schools
  where city = p_city and district = p_district
    and lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower(v_name);
  if v_id is not null then
    update public.schools set status = 'approved' where id = v_id;
    return v_id;
  end if;

  insert into public.schools (name, city, district, status, created_by)
  values (left(v_name, 160), p_city, p_district, 'approved', auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- Bekleyen okulu onayla (isteğe bağlı olarak adını düzelterek)
create or replace function public.admin_approve_school(p_school_id uuid, p_name text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_name text := nullif(regexp_replace(trim(coalesce(p_name, '')), '\s+', ' ', 'g'), '');
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  update public.schools
    set status = 'approved', name = coalesce(left(v_name, 160), name)
    where id = p_school_id;
  if not found then raise exception 'Okul bulunamadı.'; end if;
  update public.profiles p set school_name = s.name
    from public.schools s where s.id = p_school_id and p.school_id = s.id;
end;
$$;

-- Yanlış/tekrar yazılmış okulu doğru okulla birleştir: öğretmenleri taşı, eskisini sil
create or replace function public.admin_merge_school(p_from uuid, p_into uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_into_name text;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if p_from = p_into then raise exception 'Aynı okul seçildi.'; end if;
  select name into v_into_name from public.schools where id = p_into and status = 'approved';
  if v_into_name is null then raise exception 'Hedef okul bulunamadı veya onaylı değil.'; end if;

  update public.profiles set school_id = p_into, school_name = v_into_name where school_id = p_from;
  delete from public.schools where id = p_from;
end;
$$;

-- --------------------------------------------------------
-- YETKİLER & RLS
-- --------------------------------------------------------
-- Kayıt ekranı giriş yapmadan çalıştığı için onaylı okullar herkese (anon dahil) okunabilir.
-- Bekleyen okullar yalnızca admine görünür. Yazma işlemleri yalnızca yukarıdaki admin fonksiyonlarıyla.
revoke all on public.schools from anon, authenticated;
grant select (id, name, city, district, status) on public.schools to anon, authenticated;
grant delete on public.schools to authenticated;

-- Not: anon rolü is_admin()'i çalıştıramadığı için iki ayrı politika
drop policy if exists schools_select on public.schools;
drop policy if exists schools_select_anon on public.schools;
create policy schools_select_anon on public.schools for select to anon
  using (status = 'approved');
drop policy if exists schools_select_auth on public.schools;
create policy schools_select_auth on public.schools for select to authenticated
  using (status = 'approved' or (select public.is_admin()));

drop policy if exists schools_admin_delete on public.schools;
create policy schools_admin_delete on public.schools for delete to authenticated
  using ((select public.is_admin()));

-- Admin öğretmen düzenlerken okulu da değiştirebilsin; okul adı otomatik eşitlenir
grant update (school_id) on public.profiles to authenticated;

create or replace function public.profiles_sync_school_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.school_id is distinct from old.school_id then
    if new.school_id is null then
      new.school_name := null;
    else
      select name into new.school_name from public.schools where id = new.school_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_sync_school_name on public.profiles;
create trigger profiles_sync_school_name
  before update on public.profiles
  for each row execute function public.profiles_sync_school_name();
revoke execute on function public.profiles_sync_school_name() from public, anon, authenticated;

revoke execute on function public.admin_add_school(text, text, text) from public, anon;
revoke execute on function public.admin_approve_school(uuid, text) from public, anon;
revoke execute on function public.admin_merge_school(uuid, uuid) from public, anon;
grant execute on function public.admin_add_school(text, text, text) to authenticated;
grant execute on function public.admin_approve_school(uuid, text) to authenticated;
grant execute on function public.admin_merge_school(uuid, uuid) to authenticated;
