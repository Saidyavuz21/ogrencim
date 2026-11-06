-- ========================================================
-- ÖĞRETMEN ÖĞRENCİ PIN'İNİ GÖREBİLİR (kullanıcı kararı, 2026-11-06)
--  - Giriş doğrulaması yine pin_hash (bcrypt) ile yapılır; değişmez.
--  - PIN ayrıca Vault'taki anahtarla şifrelenmiş olarak pin_enc'de saklanır.
--  - Şifre çözme yalnızca öğrenciyi yönetebilen öğretmen ve admin içindir
--    (staff_can_manage_student). Anahtar API'ye açık olmayan private şemadadır.
--  - Bu migration'dan önce belirlenmiş PIN'ler geri getirilemez: o öğrencilere
--    yeni PIN verildiğinde görünür olur.
-- ========================================================

alter table public.student_credentials add column if not exists pin_enc bytea;

-- Şifreleme anahtarı (bir kez oluşturulur)
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'student_pin_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'student_pin_key', 'Öğrenci PIN şifreleme anahtarı');
  end if;
end;
$$;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.student_pin_key()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'student_pin_key' limit 1;
$$;
revoke all on function private.student_pin_key() from public, anon, authenticated;

-- --------------------------------------------------------
-- Öğrenci ekleme: PIN hem hash hem şifreli olarak saklanır
-- --------------------------------------------------------
create or replace function public.staff_create_student(p_student_number text, p_name text, p_class_name text, p_pin text, p_school_id uuid default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_school uuid;
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  if coalesce(trim(p_student_number), '') = '' or coalesce(trim(p_name), '') = '' then
    raise exception 'Okul numarası ve ad soyad zorunludur.';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;
  if not public.is_admin() and not public.teacher_has_class(trim(p_class_name)) then
    raise exception 'Öğrenciyi yalnızca kendi sınıflarınıza ekleyebilirsiniz.' using errcode = '42501';
  end if;

  v_school := case when public.is_admin() then coalesce(p_school_id, public.my_school_id()) else public.my_school_id() end;
  if v_school is null then
    raise exception 'Öğrencinin okulu belirlenemedi. Öğretmen hesabı bir okula bağlı olmalı (admin ise okul seçmeli).';
  end if;

  insert into public.students (student_number, name, class_name, school_id)
  values (trim(p_student_number), left(trim(p_name), 120), left(trim(coalesce(p_class_name, '')), 20), v_school)
  returning id into v_id;

  insert into public.student_credentials (student_id, pin_hash, pin_enc)
  values (
    v_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    extensions.pgp_sym_encrypt(p_pin, private.student_pin_key())
  );
  return v_id;
end;
$$;

-- --------------------------------------------------------
-- PIN değiştirme: hash + şifreli kopya, açık oturumlar kapanır
-- --------------------------------------------------------
create or replace function public.staff_set_student_pin(p_student_id uuid, p_pin text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.staff_can_manage_student(p_student_id) then
    raise exception 'Yalnızca kendi sınıflarınızdaki öğrencilerin PIN''ini değiştirebilirsiniz.' using errcode = '42501';
  end if;
  if p_pin !~ '^[0-9]{4}$' then
    raise exception 'PIN tam olarak 4 rakam olmalıdır.';
  end if;
  insert into public.student_credentials (student_id, pin_hash, pin_enc)
  values (
    p_student_id,
    extensions.crypt(p_pin, extensions.gen_salt('bf')),
    extensions.pgp_sym_encrypt(p_pin, private.student_pin_key())
  )
  on conflict (student_id) do update
    set pin_hash = excluded.pin_hash,
        pin_enc = excluded.pin_enc,
        failed_pin_attempts = 0,
        pin_locked_until = null,
        updated_at = now();
  delete from public.student_sessions where student_id = p_student_id;
end;
$$;

-- --------------------------------------------------------
-- PIN'leri okuma: yalnızca yönetebildiği öğrenciler (öğretmen: kendi sınıfları, admin: hepsi)
-- PIN'i bilinmeyen (eski) öğrenciler pin = null döner.
-- --------------------------------------------------------
create or replace function public.staff_list_student_pins(p_student_ids uuid[])
returns table (student_id uuid, pin text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  if not public.is_staff() then
    raise exception 'Bu işlem için yetkiniz yok.' using errcode = '42501';
  end if;
  v_key := private.student_pin_key();
  return query
    select c.student_id,
           case when c.pin_enc is null then null else extensions.pgp_sym_decrypt(c.pin_enc, v_key) end
    from public.student_credentials c
    where c.student_id = any (p_student_ids)
      and public.staff_can_manage_student(c.student_id);
end;
$$;

revoke all on function public.staff_list_student_pins(uuid[]) from public, anon;
grant execute on function public.staff_list_student_pins(uuid[]) to authenticated;
