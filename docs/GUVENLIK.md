# Güvenlik ve KVKK

Paket 8'de ([EDUBOARD_IS_LISTESI.md](EDUBOARD_IS_LISTESI.md#8-güvenlik-ve-kvkk)) kurulan yapının özeti ve elle yapılması gereken ayarlar.

## Elle yapılacaklar (panelden)

| İş | Nerede |
|---|---|
| Admin şifresini değiştir (eski şifre git geçmişinde açık) | Uygulama → Yönetim → Hesabım |
| Sızdırılmış şifre koruması | Supabase → Authentication → Settings → Password security → *Prevent use of leaked passwords* |
| CAPTCHA | Aşağıdaki adımlar |
| Aydınlatma metnindeki `[köşeli parantez]` bilgileri ve hukuki onay | `src/app/aydinlatma/page.tsx` |

### CAPTCHA (Cloudflare Turnstile)

1. Cloudflare → Turnstile → *Add site*: alan adı (ör. `tofutr.com`, geliştirme için `localhost`), mod *Managed*.
2. Verilen **Site Key**: `.env.local` ve barındırma ortamına `NEXT_PUBLIC_TURNSTILE_SITE_KEY=...` olarak eklenir, uygulama yeniden derlenir.
3. Verilen **Secret Key**: Supabase → Authentication → Attack Protection → *Enable Captcha protection* → sağlayıcı *Turnstile* → Secret Key.

Sıra önemli: Supabase'de CAPTCHA, site anahtarı yayına çıkmadan açılırsa bütün girişler (öğretmen, admin, öğrenci) "güvenlik doğrulaması tamamlanamadı" hatası verir.
CAPTCHA; öğretmen/admin girişini, öğretmen kaydını ve öğrencinin anonim oturum açmasını korur.

## İşlem kaydı (`audit_log`)

Kim, ne zaman, hangi kaydı ekledi/değiştirdi/sildi. Değişiklikte yalnızca değişen alanların eski ve yeni değeri yazılır.

- Kaydı tutulan tablolar: öğrenciler, öğrenci PIN'i (yalnızca "değişti", değer `***`), puanlar, notlar, ödevler, ödev kontrolleri ve teslimleri, okuma yarışmaları ve sonuçları, duyurular, hesaplar, okullar, öğretmen sınıfları, sınıf üyelikleri, KVKK talepleri.
- Öğrencinin puan sayaçları (`points`, `plus_count`, `minus_count`) ayrıca yazılmaz; puan geçmişi zaten kaydediliyor.
- Öğrenci silinince alt kayıtları tek tek yazılmaz; öğrencinin silinmesi yazılır, verinin kopyası Silinenler kutusundadır.
- Görüntüleme: Yönetim → İşlem ve erişim kaydı. Süper admin hepsini, okul yöneticisi kendi okulunu görür. Kimse kayıt yazamaz/silemez (yalnızca trigger'lar yazar).

## Erişim kaydı (`access_log`)

Kim, hangi öğrencinin verisini ne zaman görüntüledi. Aynı kişi aynı öğrenciyi aynı şekilde 10 dakika içinde tekrar açarsa bir kez yazılır.

- Kendiliğinden yazılanlar: giriş PIN'lerinin görüntülenmesi (`staff_list_student_pins`), verinin dışa aktarılması.
- Arayüzden yazılanlar: `logStudentAccess(studentId, 'profile' | 'report' | 'messages' | 'grades')` (`src/lib/privacyData.ts`). Öğretmen panelinde öğrenci profili/raporu açıldığında çağrılmalı (öğretmen sayfaları başka bir çalışmada düzenlendiği için henüz bağlanmadı).

## Silinenler kutusu (yumuşak silme)

- `staff_delete_student` artık öğrencinin bütün verisinin kopyasını (`deleted_students.data`) alıp öyle siler; kopya **30 gün** saklanır.
- Geri alma (`staff_restore_student`): kayıtlar trigger'lar kapalıyken geri yazılır (puan tekrar verilmez, sahiplik alanları ezilmez). Bu sürede silinmiş ödev/yarışma/quiz sorusuna ait satırlar atlanır; silinmiş öğretmene işaret eden alanlar boşaltılır. Okul numarası bu arada başka öğrenciye verildiyse geri alma durur ve uyarır.
- Süresi dolan kopyalar bir sonraki silme işleminde temizlenir.
- Yönetim → Silinenler: geri al / kalıcı sil. Öğretmen panelinde henüz yok.

## KVKK talepleri ve veli rızası

- Yönetim → KVKK ve veli rızası: veli talebi kaydı (kopya / düzeltme / silme / diğer), 30 günlük süre sayacı, veriyi JSON indirme, kalıcı silme.
- Kalıcı silme (`admin_erase_student`): öğrenci, Silinenler kopyası, birebir mesajlar ve ödev dosyaları silinir; işlem kayıtlarındaki kişisel veriler boşaltılır. Yalnızca admin ve okul yöneticisi.
- Veli rızası: `students.guardian_consent_at / _by / _version`. İmzalı form teslim alınınca işaretlenir. Metin: `/aydinlatma` (sürüm değişirse `CONSENT_VERSION` da değişmeli).

## Hata kaydı (`client_errors`)

Tarayıcıda oluşan beklenmedik hatalar (`src/lib/errorReporting.ts`, `src/instrumentation-client.ts`, `src/app/error.tsx`, `src/app/global-error.tsx`) veritabanına yazılır; dış servise (Sentry vb.) veri gitmez.

- Kayda geçmeden **hem tarayıcıda hem sunucuda** temizlenir: JWT ve anahtarlar, e-posta, kimlikler (uuid); hata mesajındaki 4+ haneli sayılar (PIN, telefon, okul no). Adres çubuğunun sorgu kısmı (`?…`) gönderilmez.
- Sayfa başına en çok 10 hata, kullanıcı başına dakikada 20, genel olarak saatte 300 kayıt. 30 gün sonra silinir.
- Yönetim → İşlem ve erişim kaydı → **Hatalar** (yalnızca süper admin).
- `report_client_error` giriş yapmamış ziyaretçiye de açıktır (giriş sayfası hataları için); Supabase bunu `anon_security_definer_function_executable` uyarısı olarak gösterir, bilerek bırakıldı.

## Canlı ders (`live_*` tabloları)

Öğretmen bir sınıfla canlı ders açınca öğrencilerin ekranına tahta, soru ve çizimler anlık gider (Supabase Realtime; RLS'e göre yalnızca görebilene).

- Yazma işlemlerinin hepsi sunucu fonksiyonuyla (`live_start`, `live_control`, `live_open_question`, `live_close_question`, `live_answer`, `live_save_layer`, `live_clear_shared`, `live_heartbeat`, `live_end`); tablolara doğrudan yazılamaz.
- Öğrenci yalnızca kendi sınıfının, 8 saatten yeni dersini görür. Doğru cevap `private.live_question_keys`'te durur; öğretmen “Cevabı göster” deyince açılır.
- Öğrencinin defteri (özel katman) yalnızca kendisine ve öğretmene görünür; öğretmen yansıtınca sınıf görür. Tahtaya (ortak katman) yalnızca kalem izni varken (süre sunucuda denetlenir) ya da ortak çalışma açıkken yazılır.
- Ders bitince çizimler ve katılım bilgisi silinir; cevaplar ve oturum 30 gün sonra silinir (bir sonraki ders başlatılırken). Görsel/ses adresleri 8 saat geçerli süreli adreslerdir.
- Test: `supabase/tests/live_test.sql` — tek bir DO bloğu; sonunda bilerek hata verir, böylece her şey geri alınır (10 Kasım 2026: 41/41).

## Tahta sürüm geçmişi (`board_versions`)

Tahta kaydedildikçe en çok 10 dakikada bir önceki hâli saklanır; son 20 sürüm, 90 gün. Yalnızca tahtanın sahibi görür; geri dönmeden önceki hâl de saklanır (`board_restore_version`).

## İstek hız sınırları

Kullanıcı başına (`private.check_rate`), aşılınca "Çok sık işlem yapıldı" hatası:

| İşlem | Sınır |
|---|---|
| Mesaj | 30 / dakika |
| Ödev teslimi | 30 / dakika |
| Puan verme | 600 / dakika |
| Duyuru | 20 / 5 dakika |
| Dosya | 100 / 5 dakika |
| Soru bankası | 200 / 5 dakika |
| Sınıf üyeliği | 200 / 5 dakika |
| Tahta | 60 / 5 dakika |
| Canlı ders çizimi | 240 / dakika |
| Canlı ders cevabı | 60 / dakika |
| Canlı ders başlatma | 30 / saat |
| Öğrenci ekleme | 300 / 5 dakika |
| Sınıf koduyla katılma | 10 / 10 dakika (yanlış kodlar da sayılır) |
| Veri dışa aktarma | 30 / saat |
| KVKK talebi | 30 / saat |

Öğrenci PIN girişinin kendi sınırı ayrıdır (5 hatalı denemede 15 dakika kilit). Giriş ve kayıt sınırları Supabase Auth'tadır.

## PIN şifreleme anahtarını yenileme

Öğretmenin görebildiği PIN kopyası Vault'taki `student_pin_key` ile şifrelidir. Anahtar sızdığından şüphelenilirse Supabase SQL Editor'de:

```sql
select private.rotate_student_pin_key();  -- yeniden şifrelenen PIN sayısını döner
```

Tek işlemde çalışır; hata olursa hiçbir şey değişmez. Öğrenci girişleri etkilenmez (giriş bcrypt hash ile doğrulanır).

## Gizli anahtar taraması

`.github/workflows/gitleaks.yml` her push ve PR'da gönderilen commit'leri tarar (`.gitleaks.toml`). Geçmişte kalan eski demo şifrelerinin commit'leri izin listesinde; **admin şifresi değiştirilmeden bu izin listesi anlamsızdır**.

## Bilerek bırakılan Supabase uyarıları

| Uyarı | Neden |
|---|---|
| `auth_allow_anonymous_sign_ins` | Öğrenci girişi anonim oturum + PIN ile çalışır. CAPTCHA ve PIN deneme sınırı bunu korur. |
| `rls_enabled_no_policy` (student_credentials, student_sessions, pin_attempts, conversation_reads, deleted_students) | Politika yokluğu = tamamen kapalı; yalnızca SECURITY DEFINER fonksiyonlar erişir. |
| `anon_security_definer_function_executable` (`report_client_error`) | Giriş sayfasındaki hataların da kaydedilmesi için; yalnızca temizlenmiş metin yazar, sınırlıdır. |
| `authenticated_security_definer_function_executable` | Uygulamanın RPC'leri ve RLS yardımcıları; her biri kendi içinde yetki kontrolü yapar. |
| `unused_index` | Veri az olduğu için henüz kullanılmadı; veri büyüyünce kullanılacak. |
| `multiple_permissive_policies` | Okuma + yazma politikalarının üst üste gelmesi; bu ölçekte performans etkisi yok. |
