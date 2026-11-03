-- ========================================================
-- ÖĞRETMEN HESAP YÖNETİMİ: düzenleme, pasif/aktif, silme (yalnızca süper admin)
-- ========================================================

-- Pasif hesap: onaylanmış ama admin tarafından erişimi durdurulmuş
alter table public.profiles add column if not exists is_active boolean not null default true;

-- Yetki kontrolleri artık "aktif" olmayı da şart koşar (pasif yapılan öğretmen anında erişimini kaybeder)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and approved and is_active
  );
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'ogretmen') and approved and is_active
  );
$$;

-- Admin; öğretmenin bilgilerini, onayını ve aktifliğini değiştirebilir. Rol API'den değiştirilemez.
revoke update on public.profiles from authenticated;
grant update (full_name, branch, city, district, school_name, class_name, approved, is_active)
  on public.profiles to authenticated;

-- Admin hesapları korunur: pasif yapılamaz, onayı kaldırılamaz
create or replace function public.profiles_protect_admin()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.role = 'admin' and (not new.approved or not new.is_active) then
    raise exception 'Yönetici hesapları pasif yapılamaz.' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_admin on public.profiles;
create trigger profiles_protect_admin
  before update on public.profiles
  for each row execute function public.profiles_protect_admin();

-- Öğretmen hesabını tamamen siler (auth kullanıcısı + profil). Admin hesapları silinemez.
create or replace function public.admin_delete_teacher(p_profile_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;

  select role into v_role from public.profiles where id = p_profile_id;
  if v_role is null then
    raise exception 'Hesap bulunamadı.';
  end if;
  if v_role = 'admin' then
    raise exception 'Yönetici hesapları silinemez.' using errcode = '42501';
  end if;

  delete from auth.users where id = p_profile_id; -- profiles satırı cascade ile silinir
end;
$$;

revoke execute on function public.profiles_protect_admin() from public, anon, authenticated;
revoke execute on function public.admin_delete_teacher(uuid) from public, anon;
grant execute on function public.admin_delete_teacher(uuid) to authenticated;
