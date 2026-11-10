# Topluluk planı (Facebook tarzı öğretmen topluluğu)

Güncelleme: 10 Kasım 2026. Kullanıcıyla konuşularak kararlaştırıldı. Her iş bitince yanına tarih ve commit yazılır.

## Kararlar

- Topluluk **herkese açık** bir sayfadır; ziyaretçi giriş yapmadan **küçük önizleme** görür ama içeriği **kullanamaz** (açamaz, sunamaz, kopyalayamaz, çözemez, beğenemez, yorum yapamaz, takip edemez).
- **Yazılar ve yorumlar** yalnızca giriş yapmış öğretmenlere görünür (öğretmenler odası).
- Öğretmen paylaşabilir: **tahta, soru seti, yazı, bağlantı**. Paylaşamaz: **fotoğraf** (öğrenci yüzü/KVKK riski) ve **dosya** (depolama). Dosya yerine Drive/YouTube bağlantısı.
- Tahta/soru setinde ders, sınıf, konu **otomatik dolar** (tahta oluşturulurken seçilmişti); yalnızca eksik olan sorulur. Yazı/bağlantı direkt paylaşılır, ders öğretmenin branşından gelir.
- Her öğretmenin **profil sayfası** ve **profil resmi** olur; öğretmenler birbirini **takip** eder.
- **Gizlilik ayarları** öğretmendedir. Kapalı bilgi diğer üyelere ve ziyaretçilere **sunucudan hiç gönderilmez**. Yönetici her şeyi görür.
- Bildirimler yalnızca site içi (zil); e-posta/SMS yok. Aynı gün birikenler birleştirilir.
- Öğrenciler topluluğu kullanamaz.
- **Görünüm:** giriş yapan öğretmene alt alta **akış** (Facebook gibi); üstte "Akış / Galeri" seçimiyle yalnızca tahta ve soru setleri **galeri** (ızgara) olarak da görülebilir. Ziyaretçiye ve öğretmen sayfasındaki paylaşımlar için **galeri**. Mobilde galeri 2 sütun, akış tek sütun.

## Aşama 0 – Gezinme ✅

- [x] Topluluk bağlantısı öğretmen üst çubuğunda (masaüstü); mobilde çekmecede kalır · 10 Kasım 2026 · `3349ba4`
- [x] Sayfa adı "Keşfet" → "Topluluk"; eski `?sayfa=kesfet` adresi yönlenir · `3349ba4`
- [x] Ana sayfa üst kısmında "Topluluk" bağlantısı (şimdilik giriş sonrası Topluluk'a götürür; Aşama 4'te herkese açık sayfaya bağlanacak) · `3349ba4`

## Veritabanı ve veri katmanı ✅

- [x] Aşama 1–4'ün bütün tabloları, güvenlik kuralları ve fonksiyonları · 10 Kasım 2026 · `099e0f0` (`supabase/migrations/20261113090000_community_social.sql`, Supabase'e uygulandı ve doğrulandı)
- [x] Arayüz için veri katmanı: `src/lib/communitySocialData.ts`
- Ekranlar Gemini ile yapılacak: istemler `docs/TOPLULUK_GEMINI_ISTEMLERI.md`; her istemden sonra Claude kontrol eder.

## Aşama 1 – Profil, gizlilik, takip ✅ (10 Kasım 2026, `bfc73ae`)

- [x] **Profil bilgileri:** görünen ad, branş, il, okul, kısa tanıtım (en fazla 200 karakter)
- [x] **Profil resmi:** yüklenirken 256 × 256 px'e küçültülür (~20 KB); kotaya sayılmaz; değiştirilince eskisi silinir. Resim yoksa baş harfler. Yüz zorunlu değil.
- [x] **Gizlilik ayarları** (varsayılanlar parantezde):
  - Ad: tam / kısaltılmış (Ayşe Y.) / takma ad (kısaltılmış)
  - Profil resmi görünsün (evet)
  - Okul görünsün (hayır) · İl görünsün (evet) · Branş görünsün (evet)
  - Profilimi kimler görsün: herkes / yalnızca öğretmenler / yalnızca takipçilerim / kimse (yalnızca öğretmenler)
  - Takip edilebilirim (evet) · Takipçi sayım görünsün (evet)
  - Paylaşımlarım herkese açık önizlemede çıksın (hayır)
- [x] Gizliliğe göre süzülmüş profil verisi yalnızca sunucu fonksiyonundan gelir (tablolar doğrudan okunamaz)
- [x] **Öğretmen sayfası:** resim, ad, branş, il, tanıtım, takipçi/takip sayısı, paylaşımları, teşekkür ve kopya toplamları, Takip et düğmesi
- [x] **Takip:** öğretmen takip etme/bırakma; takipçi ve takip listeleri; kendini takip edemez
- [x] **Konu takibi:** branş + sınıf (ör. "5. sınıf matematik")
- [x] Takip önerileri: aynı branş, aynı il

## Aşama 2 – Akış ve paylaşım ✅ (`59f72c4`)

- [x] **Paylaşım kutusu** akışın üstünde: "Bir şey yaz…" + Tahta ekle / Soru seti ekle / Bağlantı ekle
- [x] **Yazı gönderisi:** metin (en fazla 2000 karakter), ders; fotoğraf yok
- [x] **Bağlantı gönderisi:** adres + başlık; yalnızca http/https; önizleme resmi çekilmez (dış sitelere istek yok)
- [x] Tahta ve soru seti paylaşımı akışta kart olarak görünür (mevcut paylaşım altyapısı korunur)
- [x] **Önizleme resmi:** tahtanın ilk sayfasından küçük resim, paylaşım anında üretilir (~30 KB)
- [x] **Akış sekmeleri:** Takip ettiklerim / Branşım / Herkes; takip ettiklerim boşsa öneriler gösterilir
- [x] "Akış / Galeri" görünüm seçimi (galeri: yalnızca tahta ve soru setleri, ızgara; mobilde 2 sütun; seçim cihazda hatırlanır)
- [x] Öğretmen sayfasında paylaşımlar galeri olarak
- [x] Sayfalı yükleme (aşağı kaydırdıkça)
- [x] **Tepkiler:** Teşekkürler, Derste kullandım, Kaydet (mevcut favoriler), Kopyala (mevcut)
- [x] Mevcut kişisel veri taraması (öğrenci adı, telefon, e-posta, TC no) yazılara ve bağlantı başlıklarına da uygulanır
- [x] Paylaşım sıklığı sınırı (ör. günde 20 gönderi)
- [x] Öğretmen kendi gönderisini düzenler/siler

## Aşama 3 – Yorum, bildirim, denetim ✅ (`e296c4d`)

- [x] **Yorumlar** (yalnızca öğretmenler; en fazla 1000 karakter; kişisel veri taraması; sıklık sınırı)
- [x] **Bildirimler:** yeni takipçi, takip ettiğin öğretmen paylaştı, içeriğin kopyalandı, teşekkür, yorum; aynı gün birikenler tek satırda
- [x] Bildirim ayarları: takip ettiklerim paylaşınca bildir (açık/kapalı); öğretmen sayfasında "bu öğretmenin paylaşımlarında bildir"
- [x] **Şikâyet et** (gönderi, yorum, profil) → yönetici panelinde **denetim kuyruğu**: kaldır, uyar, toplulukta askıya al
- [x] **Engelle / sessize al**
- [x] Kaldırılan içerik ve şikâyet kayıtları saklanır (5651 sayılı kanun: yer sağlayıcı yükümlülükleri)

## Aşama 4 – Herkese açık topluluk ✅

- [x] Giriş gerektirmeyen `/topluluk` sayfası: yalnızca önizleme kartları (ilk sayfa resmi, başlık, ders, sınıf, sayfa/soru sayısı, yazar gizliliğe göre, teşekkür ve kopya sayısı)
- [x] Soru setinde yalnızca ilk sorunun metni; şıklar ve cevaplar yok. Tahtanın içeriği hiçbir zaman gönderilmez
- [x] Herkese açık öğretmen sayfası (profil gizliliği "herkes" ise)
- [x] Yalnızca öğretmenin "herkese açık önizlemede çıksın" dediği içerikler
- [x] Her işlem düğmesi "Giriş yap / Ücretsiz kayıt ol"a götürür
- [x] Ana sayfadaki Topluluk bağlantısı bu sayfaya yönlenir; arama motorları için başlık/açıklama
- [ ] Ziyaretçi isteklerine sıklık sınırı (kazıma önlemi) — veritabanında IP bilinmediği için yapılmadı; VPS/CDN katmanında eklenecek

## Aşama 5 – Büyüme (sonra)

- [ ] Rozetler: İlk paylaşım, 10/100 kopya, Editörün seçimi, Ayın katkıcısı
- [ ] "Bu hafta öne çıkanlar", branş rafları
- [ ] Profil tamamlama yönlendirmesi
- [ ] Gruplar (ör. "Sivas Matematik Öğretmenleri", "LGS Hazırlık")
- [ ] Yayından önce her branştan başlangıç içeriği (kullanıcı ve tanıdık öğretmenler)

## Tahmini süre (kabaca, çalışma günü)

| Aşama | Süre |
|---|---|
| 1 – Profil, profil resmi, gizlilik, takip | 2–3 gün |
| 2 – Akış, yazı/bağlantı, önizleme resmi, galeri, tepkiler | 3–4 gün |
| 3 – Yorum, bildirim, şikâyet ve denetim | 2–3 gün |
| 4 – Herkese açık önizleme sayfası | 1–2 gün |
| **Toplam (1–4)** | **~8–12 gün** |
| 5 – Rozetler, öne çıkanlar, gruplar | sonra, 3–5 gün |

Her aşama ayrı ayrı kullanılabilir hâlde biter. Tahmine tarayıcıda görsel kontrol ve düzeltmeler dahildir; gerçek öğretmenlerle deneme dahil değildir.

## Doğrulama durumu

- Tip ve lint kontrolleri geçti; ziyaretçinin yalnızca önizleme fonksiyonlarına erişebildiği canlı sunucuda denendi.
- Ekranlar tarayıcıda gerçek öğretmen hesabıyla henüz kontrol edilmedi.

## Açık sorular

- Yazı gönderisinin de "herkes görsün" seçeneği olsun mu? (şimdilik hayır: yalnızca öğretmenler)
- Öğrenciye (sınıfa) topluluk içeriği önerilsin mi? (şimdilik hayır)
