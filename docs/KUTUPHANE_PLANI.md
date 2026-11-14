# Ortak kütüphane planı (bölümler, kategoriler, hazır tahtalar)

Güncelleme: 14 Kasım 2026. Kullanıcıyla konuşularak kararlaştırıldı. Her iş bitince yanına tarih ve commit yazılır.

## Kararlar

- Kütüphane **sitenin hazırladığı içeriktir**; içeriği yalnızca süper admin ekler. Öğretmenlerin birbirine paylaştığı içerik Topluluk'tadır.
- Kütüphane **bölümlerden** oluşur. İlk bölümler: **Görseller, Çalışma kâğıtları, Animasyonlar, Hazır tahtalar**. Bölüm listesi veritabanında; yeni bölüm kod değişikliği istemez.
- **Her bölümün kendi kategori ağacı** vardır (en fazla 3 seviye). Bölüme göre ilk seviye farklıdır:
  - Hazır tahtalar: Sınıf → Ders → Konu (ör. 3. sınıf › Matematik › Kesirler)
  - Çalışma kâğıtları: Sınıf → Ders
  - Görseller: Ders/alan → Konu (ör. Fen görselleri › Duyu organları); görseller her sınıfta kullanılabildiği için sınıf seviyesi yok
  - Animasyonlar: Ders → Konu
- Ağacı süper admin yönetici panelinden kurar (ekle, adlandır, sırala, taşı, gizle).
- **Belirli gün ve haftalar** (23 Nisan, 29 Ekim…) ayrı bölüm değil **etiket**: aynı etiketle görsel, kâğıt ve tahta birlikte bulunur.
- Animasyon: ilk sürümde **GIF + YouTube bağlantısı**. MP4 ve ses (MP3) sonra (depo ayarı + sunucu trafiği kararı).
- Hazır tahtalar admin'in kendi tahta düzenleyicisinde hazırlanır, "Kütüphaneye ekle" ile yayınlanır; öğretmen "Tahtalarıma kopyala" ile alır. Asıl tahta değişmez; admin güncellerse sonraki kopyalar yeni sürümü alır.
- Topluluktan kütüphaneye alma (öğretmen izni + kaynak adı) ilk sürümde yok.

## Kim yazar

| İş | Kim |
|---|---|
| Veritabanı, taşıma, güvenlik, küçük önizleme üretimi, veri katmanı `src/lib/libraryData.ts` | Claude |
| Yönetici paneli: kategori ağacı ve öğe yönetimi | Claude (veri) + Gemini (ekran) |
| Öğretmen kütüphane ekranları (bölüm kartları, kategori kartları, yol göstergesi) | Gemini (istemler `docs/KUTUPHANE_GEMINI_ISTEMLERI.md`; her istemden sonra Claude kontrol eder) |

## Dikkat edilecek noktalar (mevcut kod incelendi)

1. **Kütüphane üç yerde kullanılıyor**, üçü de bozulmamalı:
   - Dosyalarım › Ortak kütüphane (`src/components/files/LibraryPanel.tsx`, admin için `manage`)
   - Ödev gönderirken "Dosyalarımdan ekle" (`src/components/files/HomeworkFilePicker.tsx`)
   - Tahtada görsel paneli › Kütüphane (`src/components/board/BoardEditorPanels.tsx`)
   Ödev ve tahta, seçilen dosyayı **kendi deposuna kopyalar** (`copyImageToBoard`, ödev ekleri). Bu yüzden kütüphanede öğe taşımak ya da silmek mevcut ödev ve tahtaları bozmaz. Yine de silme yerine önce **gizleme** olsun (geri alınabilir).
2. **Sayfa çok ağır:** kartlarda her resmin asıl dosyası (1–2,6 MB) imzalı adresle yükleniyor; 37 görsel ≈ 55 MB. Yüklemede **küçük önizleme** (≈ 400 px, ≈ 30 KB WebP) üretilmeli; kartlar onu göstermeli, asıl dosya yalnızca önizleme/indirme/ekleme anında.
3. **Yarım gezegenler:** Ay, Dünya, Güneş vb. kütüphanede yarım görünüyor. Yereldeki yeni dosyalar (`public/images/kutuphane/gok-cisimleri`) tam; eski sürümlerde gece yarısı siyahtı ve arka plan temizlenirken silinmiş. Başka bir araç görselleri yeniden üretiyor (`public/images/kutuphane/`, henüz commit edilmedi). Bitince kütüphanedeki eski sürümler yenileriyle değiştirilmeli. Burun resmi de önizleme kutusundan taşıyor (kontrol edilecek).
4. **Yapay zekâ ile üretilmiş görseller:** `uretim-bilgisi.json` notu "temsili görseldir, gerçek fotoğraf değildir" diyor. Öğede **kaynak / lisans** alanı olsun (ör. "Yapay zekâ ile üretilmiş temsili görsel", "tofutr", "CC BY …"); önizlemede küçük not olarak görünsün.
5. **Bölümler arası arama:** her bölümün ağacı farklı olduğu için "3. sınıf matematik için her şey" ağaçtan çıkmaz. Öğeye isteğe bağlı **sınıf seviyeleri** (çoklu) ve **ders** alanı eklenir; arama ve ileride "Branşıma göre" süzme bunları kullanır.
6. **Hazır tahtalarda dikkat:** tahtadaki resimler admin'in tahta deposunda, Mini Test parçaları admin'in soru bankasına bağlı. Kopyalarken resimler ve sorular öğretmene kopyalanmalı (Topluluk kopyalaması bunu nasıl yapıyorsa aynısı; uygulamadan önce kontrol edilecek).
7. **Öğrenci kütüphaneyi görmez** (depo okuma izni yalnızca öğretmen). Öğrenciye ulaşan her şey ödev/tahta kopyası üzerinden gider; bu korunmalı.
8. **YouTube bağlantıları:** yalnızca `youtube.com` / `youtu.be`, gömülü oynatıcı `youtube-nocookie.com` (mevcut izin politikasıyla uyumlu). Bağlantı kırılırsa admin listesinde işaretlenmeli (sonra).
9. **Adres çubuğu:** `?sayfa=dosyalarim&kutuphane=gorseller/fen/duyu-organlari` gibi; geri tuşu bir üst seviyeye döner, bağlantı paylaşılabilir.

## Aşama 0 – Hazırlık

- [ ] Küçük önizleme: yüklemede üretilir (`library-thumbs` deposu ya da aynı depoda `thumbs/`); mevcut 37 görsel için bir kerelik üretim
- [ ] Yarım görselleri yenileriyle değiştirme (diğer aracın görselleri bitince)
- [ ] Önizleme kutusunda taşma düzeltmesi

## Aşama 1 – Bölümler ve kategori ağacı

Veritabanı (Claude):
- [ ] `library_sections`: ad, adres adı (slug), açıklama, kapak resmi, sıra, gizli
- [ ] `library_categories`: bölüm, üst kategori (en fazla 3 seviye), ad, slug, kapak resmi (isteğe bağlı), sıra, gizli
- [ ] `library_items` ekleri: `section_id`, `category_id`, `kind` (`file` | `link` | `board`), `grades` (sınıf seviyeleri), `subject`, `source` (kaynak/lisans), `thumb_path`, `url` (bağlantı), `hidden`, `sort`
- [ ] Taşıma: mevcut 4 kategori → Görseller bölümü altında kategoriler (Duyu organları ve Gezegenler → Fen görselleri; Meyveler ve Okul eşyaları → kullanıcıya sorulacak)
- [ ] Güvenlik: okuma öğretmen + admin, yazma yalnızca admin; gizli bölüm/kategori/öğe öğretmene görünmez
- [ ] Bölüm/kategori sayıları ve kapakları tek çağrıda (giriş ekranı hızlı açılsın)

Veri katmanı (Claude) `src/lib/libraryData.ts`:
- [ ] `listSections`, `listCategories(section)`, `listItems({ section, category, q, grade, subject, before })`, `searchLibrary(q)`
- [ ] Admin: bölüm/kategori ekle-düzenle-sırala-taşı-gizle; öğe yükle (önizleme üretimiyle), kategori ata, gizle
- [ ] Mevcut `listLibrary` (ödev seçici ve tahta paneli) çalışmaya devam eder; sonra bölüm/kategori süzmesi eklenir

Ekranlar (Gemini):
- [ ] Öğretmen: bölüm kartları → kategori kartları → alt kategori sekmeleri + öğeler; yol göstergesi; her seviyede arama; mobilde 2 sütun
- [ ] Admin: kategori ağacı yönetimi (sürükle-bırak yerine yukarı/aşağı düğmeleri), öğe yükleme sırasında bölüm/kategori seçimi
- [ ] Ödev seçicisi ve tahta panelinde bölüm/kategori süzgeci

## Aşama 2 – Çalışma kâğıtları ve animasyonlar

- [ ] PDF'lerde ilk sayfadan küçük önizleme
- [ ] Bağlantı öğesi (YouTube): başlık, kapak (YouTube küçük resmi), gömülü önizleme
- [ ] GIF önizlemede hareketli, kartta durağan

## Aşama 3 – Hazır tahtalar

- [ ] Admin tahta düzenleyicisinde "Kütüphaneye ekle" (bölüm/kategori/sınıf/ders seçimi, önizleme resmi)
- [ ] Öğretmen: tahta önizlemesi + "Tahtalarıma kopyala" (resimler ve Mini Test soruları da kopyalanır)
- [ ] Kütüphanedeki tahtanın güncellenmesi (yeni sürüm; eski kopyalar etkilenmez)

## Aşama 4 – Sonra

- [ ] Öğretmen favorileri ("Kaydet") ve "Yeni eklenenler" şeridi
- [ ] Kullanım sayısı (kaç öğretmen ödeve/tahtaya ekledi) → popüler sıralama
- [ ] MP4 ve ses (MP3) desteği
- [ ] Topluluktan kütüphaneye alma (öğretmen izni + kaynak adı)
- [ ] Belirli gün ve haftalar için öne çıkan şerit (tarihe göre)

## Açık sorular

- Meyveler ve Okul eşyaları hangi ana kategoriye girecek? (Öneri: "Hayat Bilgisi görselleri" ya da "Genel görseller")
- Görseller bölümünün ilk seviyesi: dersler mi (Fen, Matematik, Türkçe, Hayat Bilgisi, Sosyal…) yoksa konu alanları mı (Canlılar, Uzay, Eşyalar…)?
