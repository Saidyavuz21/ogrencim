-- ========================================================
-- PIN şifreleme anahtarını yenileme (Paket 8 · Güvenlik)
--  - Öğretmenin görebildiği PIN kopyası (pin_enc) Vault'taki 'student_pin_key' ile şifreli.
--  - Bu fonksiyon yeni bir anahtar üretir, bütün pin_enc değerlerini eski anahtarla
--    çözüp yenisiyle şifreler ve Vault'taki anahtarı tek işlemde (transaction) değiştirir.
--    Hata olursa hiçbir şey değişmez.
--  - Giriş doğrulaması bcrypt pin_hash ile yapıldığı için öğrenciler etkilenmez.
--  - Yalnızca veritabanı sahibi çalıştırabilir (Supabase SQL Editor):
--        select private.rotate_student_pin_key();
--    API'den (anon/authenticated) erişilemez; 'private' şeması dışa açık değildir.
-- ========================================================

create or replace function private.rotate_student_pin_key()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret_id uuid;
  v_old text;
  v_new text := encode(extensions.gen_random_bytes(32), 'hex');
  v_count integer;
begin
  select id, decrypted_secret into v_secret_id, v_old
  from vault.decrypted_secrets where name = 'student_pin_key' limit 1;
  if v_secret_id is null then
    raise exception 'student_pin_key bulunamadı.';
  end if;

  -- Satırları kilitle; bu sırada PIN değiştirilirse eski anahtarla yazılmasın
  perform 1 from public.student_credentials where pin_enc is not null for update;

  update public.student_credentials
     set pin_enc = extensions.pgp_sym_encrypt(extensions.pgp_sym_decrypt(pin_enc, v_old), v_new)
   where pin_enc is not null;
  get diagnostics v_count = row_count;

  perform vault.update_secret(v_secret_id, v_new);
  return v_count;
end;
$$;

revoke all on function private.rotate_student_pin_key() from public, anon, authenticated;
