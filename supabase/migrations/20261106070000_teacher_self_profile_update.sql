-- ============================================================================
-- ÖĞRETMENİN KENDİ PROFİLİNİ GÜNCELLEMESİ (GÜVENLİ RPC)
-- ============================================================================
-- Öğretmen sadece kendi 'full_name' ve 'branch' alanlarını değiştirebilir.
-- Okul, il/ilçe, rehberlik sınıfı ve onay durumu sadece yöneticiler (admin) tarafından değiştirilebilir.
-- E-posta adresi ise doğrudan profiles tablosuna yazılmaz, Supabase Auth updateUser üzerinden
-- çift taraflı onay/doğrulama e-postası akışıyla yürütülür.
-- ============================================================================

create or replace function public.update_my_profile(
  p_full_name text,
  p_branch text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_clean_name text;
  v_clean_branch text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Oturum açmanız gerekiyor.' using errcode = '42501';
  end if;

  v_clean_name := left(trim(coalesce(p_full_name, '')), 120);
  v_clean_branch := left(trim(coalesce(p_branch, '')), 80);

  if length(v_clean_name) < 2 then
    raise exception 'Ad soyad en az 2 karakter olmalıdır.' using errcode = '22023';
  end if;

  if length(v_clean_branch) < 2 then
    raise exception 'Lütfen geçerli bir branş seçiniz.' using errcode = '22023';
  end if;

  -- Yalnızca ad soyad ve branş güncellenir; okul, il/ilçe, sınıf dokunulmaz
  update public.profiles
  set
    full_name = v_clean_name,
    branch = v_clean_branch
  where id = v_uid
    and is_active = true
    and approved = true;

  if not found then
    raise exception 'Profil bulunamadı veya güncelleme yetkiniz yok.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.update_my_profile(text, text) from public, anon;
grant execute on function public.update_my_profile(text, text) to authenticated;

