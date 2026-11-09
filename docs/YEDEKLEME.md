# Yedekleme ve geri yükleme

## Ne yedekleniyor

| Ne | Nasıl | Nerede |
|---|---|---|
| Veritabanı: uygulama tabloları (`public`), gizli yardımcılar (`private`), kullanıcı hesapları (`auth`), dosya kayıtları (`storage`) | `pg_dump` (custom biçim) | `db-<tarih>.dump.gpg` |
| Depolama dosyaları: ödev teslimleri, öğretmen dosyaları, quiz/tahta görselleri, öğretmen belgeleri | `scripts/backup/storage-backup.mjs` | `storage-<tarih>.tar.gz.gpg` |

Bütün yedekler **AES-256 ile şifrelenir** (`gpg --symmetric`). Öğrenci verisi içerdikleri için şifresiz kopya hiçbir yerde tutulmaz.

## Plan

- **Sıklık:** her gece 03:15 (cron).
- **Saklama:** 30 gün (`KEEP_DAYS`). Silinenler kutusunun süresiyle aynı: kalıcı silinen bir öğrencinin verisi en geç 30 gün sonra yedeklerden de çıkar (KVKK).
- **Yer:** VPS'te `/var/backups/ogrenci` + haftada bir sunucu dışına kopya (ör. başka bir sunucu ya da şifreli bulut klasörü). Yalnızca aynı sunucudaki yedek, sunucu kaybında işe yaramaz.
- **Parola:** `BACKUP_PASSPHRASE` bir parola yöneticisinde ve kâğıtta, sunucudan ayrı saklanır. Parola kaybolursa yedekler açılamaz.

## Kurulum (VPS)

```bash
sudo apt install postgresql-client gnupg nodejs npm   # pg_dump sürümü sunucudaki PostgreSQL'den eski olmamalı
cd /opt/ogrenci && npm ci                              # storage-backup.mjs için @supabase/supabase-js

sudo tee /etc/ogrenci-backup.env >/dev/null <<'ENV'
DATABASE_URL=postgres://postgres:<parola>@<sunucu>:5432/postgres
BACKUP_PASSPHRASE=<uzun-rastgele-parola>
SUPABASE_URL=https://<proje>.supabase.co
SUPABASE_SERVICE_KEY=<service_role anahtarı>
ENV
sudo chmod 600 /etc/ogrenci-backup.env

# Elle bir kez çalıştır ve çıktıyı kontrol et
sudo bash -c 'set -a; . /etc/ogrenci-backup.env; set +a; /opt/ogrenci/scripts/backup/backup.sh'

# Cron
echo "15 3 * * * root set -a; . /etc/ogrenci-backup.env; set +a; /opt/ogrenci/scripts/backup/backup.sh >> /var/log/ogrenci-backup.log 2>&1" | sudo tee /etc/cron.d/ogrenci-backup
```

Şu anki deneme Supabase projesinde (ücretsiz plan) indirilebilir otomatik yedek yoktur; aynı betik herhangi bir Linux makineden `DATABASE_URL` olarak Supabase'in **doğrudan bağlantı** adresiyle (Project Settings → Database) çalıştırılabilir.

## Geri yükleme

```bash
TARGET_DATABASE_URL=postgres://… BACKUP_PASSPHRASE=… scripts/backup/restore.sh /var/backups/ogrenci/db-<tarih>.dump.gpg
```

- Betik önce içeriği özetler, `evet` yazılmadan hiçbir şey yapmaz; geri yükleme tek işlemdir (hata olursa yarım kalmaz).
- Yeni ve boş bir veritabanına geri yükleyin; çalışan sisteme doğrudan geri yükleme son çaredir.
- Depolama dosyaları: `storage-<tarih>.tar.gz.gpg` açılır (`gpg -d … | tar xz`) ve her kova klasörü aynı yollarla yeniden yüklenir (Supabase panelinden ya da `supabase storage cp`).

### Öğrenci PIN'lerinin görünür kopyası

Öğretmenin gördüğü PIN kopyası (`student_credentials.pin_enc`) Vault'taki `student_pin_key` ile şifrelidir; Vault anahtarı başka bir sunucuya taşınmaz. Yeni sunucuda:

1. Eski sunucuda anahtarı okuyun: `select decrypted_secret from vault.decrypted_secrets where name = 'student_pin_key';`
2. Yeni sunucuda aynı değerle oluşturun: `select vault.create_secret('<değer>', 'student_pin_key', 'Öğrenci PIN şifreleme anahtarı');`
3. Ardından anahtarı yenileyin: `select private.rotate_student_pin_key();`

Bu yapılmazsa öğrenciler yine giriş yapar (giriş bcrypt hash ile doğrulanır); yalnızca öğretmen eski PIN'leri göremez, yeni PIN verildikçe görünür olur.

## Geri yükleme provası

Ayda bir: son yedeği boş bir test veritabanına geri yükleyin ve şunları kontrol edin. Denenmemiş yedek, yedek sayılmaz.

```sql
select count(*) from public.students;
select count(*) from public.points_history;
select max(created_at) from public.points_history;   -- yedek tarihine yakın olmalı
select count(*) from auth.users;
```
