# Bildirim planı (zil, sayaç, telefon bildirimi, ikon rozeti)

Güncelleme: 14 Kasım 2026. Kullanıcıyla konuşularak kararlaştırıldı. Her iş bitince yanına tarih ve commit yazılır.

## Kararlar

- Bildirim **öğrenci ve öğretmen** için. Veli rolü yok (tek öğrenci hesabı).
- Önce **site içi zil + okunmamış sayısı** (her cihazda çalışır), sonra **telefon bildirimi (Web Push)** ve **ikon rozeti**. Play Store uygulaması şimdilik yok; PWA yeterli.
- Bütün bildirimler **tek tabloda** (`notifications`) toplanır; zil, sayaç, push ve rozet aynı kayıttan beslenir.
- Bildirimler **veritabanında, tetikleyicilerle** üretilir (istemci "bildirim gönder" diyemez; sahte bildirim olmaz).
- Öğretmene giden yoğun olaylar **toplanır**: "7-A: 5 yeni teslim" tek satır, 30 ayrı satır değil.
- **Gece 22:00–07:00 push yok**; bildirim zilde bekler. Öğretmen kendi tarafında bu sessiz saatleri değiştirebilir, öğrencide sabittir.
- Her bildirim türü ayarlardan **ayrı ayrı açılıp kapatılır** (zil / push ayrı).
- **Kilit ekranında içerik yok:** push metni "Öğretmenin yeni bir mesaj gönderdi" gibidir; mesaj metni, puan, öğrenci adı push'a girmez (KVKK, ortak cihazlar).
- **Öğrenci çıkış yapınca** o cihazın push aboneliği silinir (okul tableti gibi ortak cihazda başka çocuğa bildirim gitmesin).
- İlgili sayfa açılınca bildirim kendiliğinden okundu olur (ör. sohbet açılınca o sohbetin mesaj bildirimi).
- "Tahta yorumu" = **Topluluktaki gönderilere (paylaşılan tahta, soru seti, yazı) yapılan yorumlar.** Bunlar zaten `community_notifications` tablosuna düşüyor (yalnızca topluluk sayfasındaki zilde). Aşama 1'de ana zile ve sayaca bağlanır, Aşama 2'de push alır. Topluluğu yalnızca öğretmenler kullandığı için bu bildirim yalnızca öğretmene gider.

## Kim yazar

| İş | Kim |
|---|---|
| Veritabanı: tablolar, güvenlik kuralları, tetikleyiciler, fonksiyonlar | Claude |
| Veri katmanı `src/lib/notificationData.ts` | Claude |
| Service worker, push aboneliği, VAPID anahtarları, gönderici fonksiyon, rozet | Claude |
| Ekranlar: zil, bildirim listesi, ayarlar, "Bildirimlere izin ver" kartı | Gemini (istemler `docs/BILDIRIM_GEMINI_ISTEMLERI.md`; her istemden sonra Claude kontrol eder) |

Gerekçe: güvenlik, yetki ve sunucu işi hata kaldırmaz ve canlı veritabanına gider; ekranlar ise DESIGN.md kurallarıyla Gemini'nin iyi yaptığı iş.

## Bildirim türleri

### Öğrenci alır

| Tür (`kind`) | Ne zaman | Aşama |
|---|---|---|
| `mesaj` | Öğretmen mesaj yazdı (birebir ya da sınıf grubu) | 1 |
| `odev_yeni` | Sınıfına ödev atandı | 1 |
| `odev_degerlendirildi` | Ödevi kontrol edildi / sonuç açıklandı | 1 |
| `canli_ders` | Sınıfında canlı ders başladı | 1 |
| `duyuru` | Okulunda duyuru | 1 |
| `odev_hatirlatma` | Teslim etmediği ödevin bitimine 24 saat kaldı | 3 |
| `quiz` | Quiz / yarışma atandı veya başladı | 3 |
| `soru_cevap` | Sorduğu soru cevaplandı | 3 |

### Öğretmen alır

| Tür (`kind`) | Ne zaman | Aşama |
|---|---|---|
| `mesaj` | Öğrenci veya öğretmen mesaj yazdı | 1 |
| `odev_teslim` | Öğrenci ödev teslim etti (ödev başına toplanır) | 1 |
| Topluluk: `comment` | Topluluktaki gönderisine (tahta, soru seti, yazı) yorum yapıldı | 1 |
| Topluluk: diğerleri | Takip, yeni gönderi, kopyalama, teşekkür, "derste kullandım", moderasyon (mevcut türler) | 1 |
| Topluluk: `comment_reply` | Yorum yaptığı gönderiye başkası da yorum yazdı | 3 |
| `duyuru` | Okul yönetiminden / süper adminden duyuru | 1 |
| `odev_bitti` | Süre doldu: "7-A: 4 öğrenci teslim etmedi" özeti | 3 |
| `soru_yeni` | Öğrenci soru sordu | 3 |
| `quiz_bitti` | Quiz sonuçları hazır | 3 |
| `tahta_paylasildi` | Zümreden tahta / şekil paylaşıldı | 3 |
| `dosya_silinecek` | Dosyasının süresi 3 gün içinde dolacak | 3 |

## Aşama 1 – Zil ve okunmamış sayısı

Veritabanı (Claude) ✅ 14 Kasım 2026 · `d53403f` · `supabase/migrations/20261117090000_notifications.sql` (canlıya uygulandı; önce canlıda geri alınan işlemle test edildi):
- [x] `notifications`: alıcı (`recipient_user` öğretmen **ya da** `recipient_student` öğrenci), `kind`, `sub`, `group_key`, `ref_id`, `title`, `body`, `actor_name`, `count`, `updated_at`, `read_at`, `push_state`
- [x] **Toplama:** aynı alıcıya aynı `group_key` ile okunmamış kayıt varsa yeni satır açılmaz; `count` artar (mesaj, teslim, topluluk) ya da yalnızca yenilenir (ödev, değerlendirme, duyuru, canlı ders)
- [x] `notification_settings`: tür başına zil / push kapatma; sessiz saatler (yalnızca öğretmen değiştirir)
- [x] Güvenlik: istemci yazamaz; yalnızca kendi satırını okur (RLS, realtime için) ve fonksiyonlarla okundu yapar
- [x] Tetikleyiciler: `messages`, `homeworks` (yeni + sonuç açıklama), `homework_checks`, `homework_submissions` (teslim), `live_sessions` (başladı; bitince okunmamış bildirim silinir), `announcements`. Kaynak silinince bildirimi de silinir. Bildirim hatası asıl işi hiçbir zaman durdurmaz
- [x] **Topluluk köprüsü:** `community_notifications` → `kind = 'topluluk'`, `sub` = topluluk türü; yorumlar gönderi başına toplanır. Ana zilden okundu yapılınca topluluk kaydı da okunur, topluluk sayfasında okununca ana zildeki de okunur
- [x] Mesaj alıcıları: öğrenci yazarsa bu sohbete son 180 günde yazmış öğretmenler, yoksa öğrencinin sınıflarının öğretmenleri; öğretmen yazarsa birebirde öğrenci, sınıf grubunda sınıfın öğrencileri
- [x] Toplu dağıtım sınırı (sınıf 5000, duyuru 20000)
- [x] Eski bildirimler: okunmuşlar 60 gün, hepsi 180 gün sonra silinir (pg_cron `notifications-cleanup`)
- [x] Realtime yayınına eklendi

Veri katmanı (Claude) ✅ `d53403f` · `src/lib/notificationData.ts`:
- [x] `countUnreadNotifications`, `listNotifications`, `markNotificationsRead`, `markNotificationGroupsRead` + `notificationGroups`, `getNotificationSettings` / `saveNotificationSettings`, `notificationText`, `notificationTarget`, `useUnreadNotifications` (realtime + 60 sn + sekmeye dönünce; destekleyen tarayıcıda ikon rozeti)
- [x] Sohbet açılınca mesaj bildirimi okunur (öğretmen ve öğrenci mesaj sayfaları; sınıf grubu `mark_group_read` içinde)
- [ ] Ödev, teslim, canlı ders, duyuru açılınca okunma → Gemini İstem 4

Ekranlar (Gemini; istemler `docs/BILDIRIM_GEMINI_ISTEMLERI.md`):
- [ ] Öğretmen ve öğrenci kabuğunda **zil** + kırmızı sayı (9'dan fazlası "9+"); masaüstünde üst çubukta, mobilde üst çubukta
- [ ] Zile basınca **bildirim listesi** (masaüstü açılır panel, mobil tam ekran sayfa): ikon, metin, göreli zaman, okunmamış vurgusu, "Tümünü okundu yap", tıklayınca ilgili sayfaya gider
- [ ] Menüde mesajlar ve ödevler yanında okunmamış sayısı
- [ ] Ayarlar: tür başına zil / push anahtarları, sessiz saatler (öğretmen)

## Aşama 2 – Telefon bildirimi (Web Push) ve ikon rozeti

Altyapı (Claude):
- [ ] **VAPID anahtar çifti**: gizli anahtar sunucuda (Supabase Vault + Edge Function ortamı), açık anahtar `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- [ ] `push_subscriptions`: alıcı, `endpoint` (tekil), `p256dh`, `auth`, cihaz bilgisi, `last_ok_at`; öğrenci çıkışında ve 410/404 yanıtında silinir
- [ ] **Service worker** `public/sw.js`: `push` → bildirim göster + `setAppBadge(sayı)`; `notificationclick` → ilgili sayfayı aç / öne getir. Önbellekleme yok (yalnızca bildirim)
- [ ] **Gönderici:** Edge Function `send-push` (mevcut `purge-expired-files` düzeniyle). `notifications` eklenince pg_net ile tetiklenir, pg_cron her dakika yedek tarama yapar; `push_state` = bekliyor → gönderildi / atlandı / ertelendi
- [ ] Kurallar: tür push'a kapalıysa atla; sessiz saatteyse sabah 07:00'ye ertele (birikenler tek özet push); aynı `group_key` için 10 dakikada en fazla bir push
- [ ] Rozet: uygulama açıkken `navigator.setAppBadge(okunmamış)`, hepsi okununca `clearAppBadge()`. Android'de rozet bildirimden gelir (Samsung sayı gösterir)
- [ ] `manifest.json` kontrolü: `display: standalone`, `start_url`, ikonlar, `id` (iPhone'da push için ana ekrana ekleme şart)

Ekranlar (Gemini):
- [ ] **"Bildirimleri aç" kartı**: ilk girişte değil, kullanıcı bir şey yaptıktan sonra (ör. ödev teslim edince / mesaj gönderince) bir kez; reddederse 30 gün sormaz
- [ ] iPhone'da ana ekrana eklenmemişse "Önce Paylaş → Ana Ekrana Ekle" yönergesi
- [ ] Ayarlarda "Bu cihazda bildirimler: açık / kapalı" ve "Deneme bildirimi gönder"

Doğrulama (kullanıcıyla birlikte, gerçek cihazda):
- [ ] Samsung + Chrome / Samsung Internet: bildirim, tıklayınca doğru sayfa, ikonda sayı
- [ ] iPhone (ana ekrana eklenmiş): bildirim ve rozet
- [ ] Masaüstü Chrome / Edge
- [ ] Öğrenci çıkış yapınca o cihaza bildirim gitmiyor

## Aşama 3 – Ek bildirim türleri

- [ ] Ödev son gün hatırlatması (pg_cron, saatlik; yalnızca teslim etmeyenlere, ödev başına bir kez)
- [ ] Süre doldu özeti öğretmene
- [ ] Topluluk: yorum yaptığı gönderiye yeni yorum (`comment_reply`; gönderi başına toplanır, kişi isterse kapatır)
- [ ] Öğrenci sorusu / cevabı
- [ ] Quiz atandı-başladı / sonuçlar hazır
- [ ] Zümre paylaşımı
- [ ] Dosya silinecek uyarısı

## Aşama 4 – Toparlama

- [ ] Topluluk sayfasındaki ayrı zil kaldırılır (ana zil yeterli olduğu doğrulanınca)
- [ ] Yönetici panelinde bildirim istatistiği (gönderilen / başarısız push sayısı)

## Açık noktalar

- Okul tabletlerinde birden fazla öğrenci aynı cihazı kullanıyorsa push yalnızca son giriş yapan öğrenciye gider (çıkışta abonelik silinir). Kabul edildi sayılır; sorun çıkarsa öğrenci tarafında push kapatılabilir.
- Edge Function içinde Web Push kütüphanesinin (Deno) çalıştığı Aşama 2 başında denenir; çalışmazsa gönderici Next.js API rotasına taşınır.
