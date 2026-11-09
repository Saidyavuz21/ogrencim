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

## Aşama 0 – Gezinme ✅

- [x] Topluluk bağlantısı öğretmen üst çubuğunda (masaüstü); mobilde çekmecede kalır · 10 Kasım 2026 · `3349ba4`
- [x] Sayfa adı "Keşfet" → "Topluluk"; eski `?sayfa=kesfet` adresi yönlenir · `3349ba4`
- [x] Ana sayfa üst kısmında "Topluluk" bağlantısı (şimdilik giriş sonrası Topluluk'a götürür; Aşama 4'te herkese açık sayfaya bağlanacak) · `3349ba4`

## Aşama 1 – Profil, gizlilik, takip

- [ ] **Profil bilgileri:** görünen ad, branş, il, okul, kısa tanıtım (en fazla 200 karakter)
- [ ] **Profil resmi:** yüklenirken 256 × 256 px'e küçültülür (~20 KB); kotaya sayılmaz; değiştirilince eskisi silinir. Resim yoksa baş harfler. Yüz zorunlu değil.
- [ ] **Gizlilik ayarları** (varsayılanlar parantezde):
  - Ad: tam / kısaltılmış (Ayşe Y.) / takma ad (kısaltılmış)
  - Profil resmi görünsün (evet)
  - Okul görünsün (hayır) · İl görünsün (evet) · Branş görünsün (evet)
  - Profilimi kimler görsün: herkes / yalnızca öğretmenler / yalnızca takipçilerim / kimse (yalnızca öğretmenler)
  - Takip edilebilirim (evet) · Takipçi sayım görünsün (evet)
  - Paylaşımlarım herkese açık önizlemede çıksın (hayır)
- [ ] Gizliliğe göre süzülmüş profil verisi yalnızca sunucu fonksiyonundan gelir (tablolar doğrudan okunamaz)
- [ ] **Öğretmen sayfası:** resim, ad, branş, il, tanıtım, takipçi/takip sayısı, paylaşımları, teşekkür ve kopya toplamları, Takip et düğmesi
- [ ] **Takip:** öğretmen takip etme/bırakma; takipçi ve takip listeleri; kendini takip edemez
- [ ] **Konu takibi:** branş + sınıf (ör. "5. sınıf matematik")
- [ ] Takip önerileri: aynı branş, aynı il

## Aşama 2 – Akış ve paylaşım

- [ ] **Paylaşım kutusu** akışın üstünde: "Bir şey yaz…" + Tahta ekle / Soru seti ekle / Bağlantı ekle
- [ ] **Yazı gönderisi:** metin (en fazla 2000 karakter), ders; fotoğraf yok
- [ ] **Bağlantı gönderisi:** adres + başlık; yalnızca http/https; önizleme resmi çekilmez (dış sitelere istek yok)
- [ ] Tahta ve soru seti paylaşımı akışta kart olarak görünür (mevcut paylaşım altyapısı korunur)
- [ ] **Önizleme resmi:** tahtanın ilk sayfasından küçük resim, paylaşım anında üretilir (~30 KB)
- [ ] **Akış sekmeleri:** Takip ettiklerim / Branşım / Herkes; takip ettiklerim boşsa öneriler gösterilir
- [ ] Sayfalı yükleme (aşağı kaydırdıkça)
- [ ] **Tepkiler:** Teşekkürler, Derste kullandım, Kaydet (mevcut favoriler), Kopyala (mevcut)
- [ ] Mevcut kişisel veri taraması (öğrenci adı, telefon, e-posta, TC no) yazılara ve bağlantı başlıklarına da uygulanır
- [ ] Paylaşım sıklığı sınırı (ör. günde 20 gönderi)
- [ ] Öğretmen kendi gönderisini düzenler/siler

## Aşama 3 – Yorum, bildirim, denetim

- [ ] **Yorumlar** (yalnızca öğretmenler; en fazla 1000 karakter; kişisel veri taraması; sıklık sınırı)
- [ ] **Bildirimler:** yeni takipçi, takip ettiğin öğretmen paylaştı, içeriğin kopyalandı, teşekkür, yorum; aynı gün birikenler tek satırda
- [ ] Bildirim ayarları: takip ettiklerim paylaşınca bildir (açık/kapalı); öğretmen sayfasında "bu öğretmenin paylaşımlarında bildir"
- [ ] **Şikâyet et** (gönderi, yorum, profil) → yönetici panelinde **denetim kuyruğu**: kaldır, uyar, toplulukta askıya al
- [ ] **Engelle / sessize al**
- [ ] Kaldırılan içerik ve şikâyet kayıtları saklanır (5651 sayılı kanun: yer sağlayıcı yükümlülükleri)

## Aşama 4 – Herkese açık topluluk

- [ ] Giriş gerektirmeyen `/topluluk` sayfası: yalnızca önizleme kartları (ilk sayfa resmi, başlık, ders, sınıf, sayfa/soru sayısı, yazar gizliliğe göre, teşekkür ve kopya sayısı)
- [ ] Soru setinde yalnızca ilk sorunun metni; şıklar ve cevaplar yok. Tahtanın içeriği hiçbir zaman gönderilmez
- [ ] Herkese açık öğretmen sayfası (profil gizliliği "herkes" ise)
- [ ] Yalnızca öğretmenin "herkese açık önizlemede çıksın" dediği içerikler
- [ ] Her işlem düğmesi "Giriş yap / Ücretsiz kayıt ol"a götürür
- [ ] Ana sayfadaki Topluluk bağlantısı bu sayfaya yönlenir; arama motorları için başlık/açıklama
- [ ] Ziyaretçi isteklerine sıklık sınırı (kazıma önlemi)

## Aşama 5 – Büyüme (sonra)

- [ ] Rozetler: İlk paylaşım, 10/100 kopya, Editörün seçimi, Ayın katkıcısı
- [ ] "Bu hafta öne çıkanlar", branş rafları
- [ ] Profil tamamlama yönlendirmesi
- [ ] Gruplar (ör. "Sivas Matematik Öğretmenleri", "LGS Hazırlık")
- [ ] Yayından önce her branştan başlangıç içeriği (kullanıcı ve tanıdık öğretmenler)

## Açık sorular

- Yazı gönderisinin de "herkes görsün" seçeneği olsun mu? (şimdilik hayır: yalnızca öğretmenler)
- Öğrenciye (sınıfa) topluluk içeriği önerilsin mi? (şimdilik hayır)
