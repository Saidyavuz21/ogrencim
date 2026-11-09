# EduBoard İş Listesi

EduBoard yol haritasındaki özellikleri ogrenci'ye adım adım eklemek için çalışma listesi. Kaynak: [EDUBOARD_KARSILASTIRMA.md](EDUBOARD_KARSILASTIRMA.md) (madde numaraları oradaki modülleri gösterir, ör. *K-6* = Modül 6).

Kural: Bizde zaten olan ya da benzeri olan özellikler de gerekiyorsa değiştirilip en iyi hâline getirilir; bunlar **iyileştir** etiketiyle yazılı.

**İşaretler:** `[x]` bitti · `[~]` sürüyor · `[ ]` bekliyor
Her iş bitince: kutu işaretlenir, tarih ve commit yazılır.

---

## İlerleme

| # | Paket | Bitti / Toplam |
|---|---|---|
| 0 | Acil düzeltmeler | 3 / 3 ✅ |
| 1 | Sınıf araçları | 5 / 5 ✅ |
| 2 | Ödev sistemini güçlendirme | 8 / 8 ✅ |
| 2b | Okuma yarışması (bizde ek) | 5 / 5 ✅ |
| 3 | Öğretmen dosyaları ve içerik düzeni | 8 / 8 ✅ |
| 4 | Quiz motoru | 11 / 11 ✅ |
| 5 | Analitik ve raporlama | 6 / 6 ✅ |
| 6 | Sınıf ve okul yapısı | 6 / 6 ✅ |
| 7 | Etkileşimli tahta | 15 / 15 ✅ |
| 7b | Tahta: metin, gruplama, şekil kütüphanesi | 13 / 13 ✅ |
| 8 | Güvenlik ve KVKK | 9 / 13 |
| 9 | Kalite: test, CI, izleme | 6 / 7 |
| 10 | Canlı ders | 7 / 7 ✅ |
| 11 | Topluluk / Keşfet | 9 / 9 ✅ |
| 12 | Yapay zekâ | 0 / 5 |
| | **Toplam** | **111 / 121** |

**Sıra (9 Kasım 2026):** Güvenlik ve KVKK öne alındı; canlı ders ve topluluk ona dayanıyor (öğrenci verisi anlık paylaşılıyor / herkese açık içerik). Ardından kalite (temiz build, CI, yedek), sonra canlı ders (tek öğretmenle de işe yarar), topluluk (çok öğretmen olunca değer kazanır) ve en son yapay zekâ.

---

## 0. Acil düzeltmeler

- [x] Duyuruları okula göre ayır; öğretmen yalnızca kendi duyurusunu silsin, süper admin okul seçerek yayınlasın, yazar adı sunucuda atansın — *K-12, K-14* · 6 Kasım 2026 · `1a759ab`
- [x] "Sınıflarım" sayfa açıklamasındaki olmayan "katılım kodu" ifadesini düzelt · 6 Kasım 2026 · `d40a0f4`
- [x] `docs/YOL_HARITASI.md`'yi güncelle (3 Kasım'dan beri yapılanlar, veli rolünün kaldırılması, eski dosya adları) · 6 Kasım 2026 · `d40a0f4`

## 1. Sınıf araçları

Veritabanı gerektirmez; derste her gün kullanılır. Öğretmen panelinde yeni "Sınıf araçları" sayfası, tam ekran açılabilir.

- [x] **Rastgele öğrenci seçici** — seçilen sınıftan; aynı turda tekrar seçmeme (herkes bir kez seçilene kadar), "yok" işaretlenen öğrenciyi atlama, akıcı çekiliş animasyonu — *K-4, K-11* · 6 Kasım 2026 · `fc2a2ca`
- [x] **Kronometre** — başlat / duraklat / sıfırla, tur zamanları, tam ekran büyük rakamlar — *K-4* · 6 Kasım 2026 · `21ec5fc`
- [x] **Geri sayım** — hazır süreler (1, 3, 5, 10 dk) ve özel süre, bitişte ses ve görsel uyarı — *K-4* · 6 Kasım 2026 · `1118a0b`
- [x] **Grup oluşturucu** — sınıfı N gruba ya da N kişilik gruplara rastgele bölme (bizde ek) · 6 Kasım 2026 · `c241991`
- [x] Araçların akvaryum gibi tam ekran ve akıllı tahtada kullanılabilir olması (büyük dokunma alanları) · 6 Kasım 2026 · `c241991`

## 2. Ödev sistemini güçlendirme (iyileştir)

Bizdeki ödev, EduBoard'daki "yayın"ın karşılığı. Quiz motoru da bunun üstüne kurulacak.

- [x] **İyileştir:** Aynı ödevi birden çok sınıfa tek seferde verme — *K-2, K-6* · 6 Kasım 2026 · `ef590a3` (veritabanında da öğretmenin kendi sınıflarıyla sınırlı)
- [x] **İyileştir:** Teslim tarihi doğrulaması (geçmiş tarih engeli) ve isteğe bağlı teslim saati — *K-6* · 6 Kasım 2026 · `71f5852`
- [x] **Sonuçları açıklama:** öğretmen kontrol sonucunu hemen ya da "sonra açıkla" ile gösterebilsin — *K-6* · 6 Kasım 2026 · `23081db` (gizliyken davranış puanı da bekler; açıklanınca tek seferde işlenir)
- [x] **Öğrenci teslimi:** öğrenci dosya/fotoğraf yükleyip teslim eder (taslak → teslim edildi) — *K-7* · 6 Kasım 2026 · `50a8def` (öğretmen ödevde "Uygulamadan teslim" seçer; öğretmen teslimi iade edebilir)
- [x] **Teslim kilidi:** teslim tarihi geçince ya da teslim edildikten sonra değişiklik yapılamaz — *K-7* · 6 Kasım 2026 · `50a8def` (veritabanı tetikleyicisi + Storage politikaları)
- [x] **Otomatik kapanış:** teslim tarihi gelince ödev kendiliğinden kapanır (zamanlanmış görev) — *K-7* · 6 Kasım 2026 · `50a8def` (zamanlanmış görev yerine her yazmada sunucuda `due_at > now()` denetlenir, gecikmesiz; öğretmen ayrıca elle kapatıp açabilir)
- [x] Öğretmene teslim durumu özeti: kaç kişi teslim etti, kim etmedi — *K-8* · 6 Kasım 2026 · `50a8def` (kontrol sayfasında özet + öğrenci bazında dosyalar; ödev listesinde teslim sayısı)
- [x] **İyileştir:** Dosya türünü içeriğe bakarak doğrulama (yalnızca uzantı/MIME değil) — *K-9* · 6 Kasım 2026 · `50a8def` (ilk baytlara bakılır, gerçek tür ile yüklenir; sunucuda bucket MIME listesi. Tam sunucu taraflı içerik denetimi için ileride Edge Function gerekir)

## 2b. Okuma yarışması (bizde ek)

Okuma hızı: öğrencinin 1 dakikada okuduğu kelime sayısı. Metin uygulamada yok; öğretmen kendi kitabından okutur.

- [x] "Okuma yarışması oluştur": tarih bugün, sıra ve ad otomatik ("N. Okuma Yarışması", sınıf başına) · 7 Kasım 2026 · `ed1ffd2`
- [x] Ölçüm: sınıf listesinden öğrenci seç → pencerede "Süreyi başlat" (60 sn, bip) → okunan kelime sayısı · 7 Kasım 2026 · `ed1ffd2`
- [x] "Okuma yarışmasını bitir": o günün sıralaması kesinleşir; ölçülmeyenler sonradan eklenir ("sonradan" etiketi, madalya almaz) · 7 Kasım 2026 · `ed1ffd2`
- [x] Sıralamalar: en hızlılar ve en çok gelişenler (bir önceki yarışmaya göre); öğretmende gelişim tablosu · 7 Kasım 2026 · `ed1ffd2`
- [x] Öğrenci paneli "Okuma yarışması": kendi sonucu ve sırası, ilk 10, en çok gelişenler, gelişim grafiği · 7 Kasım 2026 · `ed1ffd2`

## 3. Öğretmen dosyaları ve içerik düzeni

- [x] **Dosyalarım** sayfası: yükle, listele, önizle (PDF, görsel), sil — *K-5, K-9* · 7 Kasım 2026 · `07bec54` (PDF, resim, Word, PowerPoint, Excel; dosya başına 25 MB; tür ilk baytlardan doğrulanır)
- [x] Klasörler ve sürükleyerek sıralama — *K-5* · 7 Kasım 2026 · `07bec54` (tek seviye klasör; dosyayı klasör adına bırakarak taşıma, satırı sürükleyerek sıralama; klavye için menüde yukarı/aşağı)
- [x] Etiketler: kademe, branş, konu, serbest etiket; bunlarla arama ve filtreleme — *K-5* · 7 Kasım 2026 · `07bec54`
- [x] Ödeve "Dosyalarımdan ekle" (yeniden yüklemeden) — *K-9* · 7 Kasım 2026 · `07bec54` (dosya sunucuda ödeve kopyalanır; Dosyalarım'dan silinse de ödevde kalır)
- [x] Sınıfla paylaşım; öğrenci panelinde "Ders materyalleri" — *K-5* · 7 Kasım 2026 · `07bec54` (yalnızca kendi sınıflarına; isteğe bağlı not)
- [x] Öğretmen başına depolama kotası ve kullanım göstergesi — *K-9* · 7 Kasım 2026 · `07bec54` (500 MB; hem kayıt tetikleyicisi hem depolama yükleme kuralı denetler)
- [x] Setler: birden çok içeriği tek paket yapma (ör. "8. Sınıf LGS Matematik Seti") — *K-5* · 7 Kasım 2026 · `07bec54` (sıralı; sınıfla paylaşılır)
- [x] Ortak eğitim medya kütüphanesi (bütün öğretmenlerin kullanabildiği hazır görseller, kotadan muaf) — *K-9* · 7 Kasım 2026 · `07bec54` (yönetici panelinde "Ortak kütüphane" sayfasından yüklenir; içerik henüz boş)

## 4. Quiz motoru

Doğru cevaplar asla tarayıcıya gönderilmez; değerlendirme sunucuda yapılır.

- [x] Soru bankası: çoktan seçmeli soru (metin + görsel, 2–5 şık) oluşturma ve düzenleme — *K-4* · 7 Kasım 2026 · `c8a8d9e` (görsel yüklenir ya da Dosyalarım/kütüphaneden seçilir; ders, kademe, konu, etiket; çoğaltma)
- [x] Cevap anahtarı yalnızca sunucuda (RLS + sunucu fonksiyonu) — *K-4, K-14* · 7 Kasım 2026 · `c8a8d9e` (öğrenci tablolara erişemez; sorular ve sonuç yalnızca `quiz_state` ile, doğru cevap yalnızca açıklanabiliyorsa)
- [x] Quiz'i sınıfa yayınlama (ödev altyapısıyla) — *K-6* · 7 Kasım 2026 · `c8a8d9e` (Ödev gönder'de tür "Quiz"; birden çok sınıfa; sorular yayınlanınca dondurulur)
- [x] **Alıştırma modu:** anında doğru/yanlış dönütü, soru başına 3 deneme — *K-6* · 7 Kasım 2026 · `c8a8d9e` (puan 1 / 0,5 / 0,25; çözüm açıklaması)
- [x] **Sınav modu:** teslim tarihi zorunlu, tarih geçene kadar sonuç gizli — *K-6* · 7 Kasım 2026 · `c8a8d9e` (tarih geçince ilk açılışta sunucu kapatır: yarım kalanlar biter, girmeyenler "yapmadı", sonuçlar açıklanır)
- [x] Doğru çözülen sorunun sonradan bozulmaması; puanın sunucuda tek işlemde artması — *K-6* · 7 Kasım 2026 · `c8a8d9e`
- [x] Soru başına kısa tekrar sınırı (art arda deneme koruması) — *K-6* · 7 Kasım 2026 · `c8a8d9e` (alıştırmada 1,5 sn, sınavda 0,3 sn)
- [x] Gelen cevabın quiz'in sorularına ait olduğunun doğrulanması — *K-6* · 7 Kasım 2026 · `c8a8d9e`
- [x] Sayfa kapanırken son cevapların kaybolmaması (sınav modu) — *K-7* · 7 Kasım 2026 · `c8a8d9e` (her seçim anında kaydedilir; kaydedilemeyen cihazda bekler, bağlantı gelince ya da sayfa açılınca gönderilir; kapanırken uyarı)
- [x] Öğrenci quiz ekranı (mobil uyumlu) ve sonuç ekranı — *K-6* · 7 Kasım 2026 · `c8a8d9e` (sonuç Ödev kontrolü'ne işlenir: %70+ yaptı, %40–69 kısmen; öğretmene sonuç paneli)
- [x] **Soru bankası ve quiz sayfalarında formül ve zengin metin (iyileştir)** · 8 Kasım 2026 · `a8d7ea5` (RichTextField bileşeni: B/I/U, renk, vurgu, listeler, MathPalette, canlı önizleme; KaTeX tembel yükleme; soru, şık, çözüm, quiz çözme ve sonuç ekranları)

## 5. Analitik ve raporlama

- [x] **Isı haritası:** soru bazında sınıf başarı oranı — *K-8* · 7 Kasım 2026 · `b7879b1` (Ödev kontrolü'nde quiz sonuç paneli: öğrenci × soru, sütun başında doğru oranı)
- [x] Öğretmen için sınıf karnesi: ders bazında not ortalamaları ve dağılım — *K-8* · 7 Kasım 2026 · `b7879b1` (MEB aralıklarıyla dağılım, sınavlara göre ortalama, öğrenci özeti ve ödev yapma oranı)
- [x] Öğrenci gelişim sayfası: puan ve not değişimi zaman içinde — *K-8* · 7 Kasım 2026 · `b7879b1` (öğrencide "Gelişimim", öğretmende karneden açılır)
- [x] Not ve puan listelerini Excel/CSV olarak dışa aktarma — *K-8* · 7 Kasım 2026 · `b7879b1` (Türkçe Excel'de doğrudan açılan CSV; quiz sonuçları da)
- [x] Rapor ve tahtayı PDF/PNG olarak dışa aktarma — *K-8* · 7 Kasım 2026 · `b7879b1` (raporlar: Yazdır / PDF, grafikler PNG. Tahta henüz yok; tahtanın dışa aktarımı 7. pakete ayrı iş olarak eklendi)
- [x] Öğrencinin quiz/çözüm cevaplarını tek tek inceleme — *K-8* · 7 Kasım 2026 · `b7879b1`

## 6. Sınıf ve okul yapısı (iyileştir)

- [x] **İyileştir:** Öğrenci birden çok sınıfa/derse üye olabilsin (sınıf üyeliği tablosu) — *K-2* · 7 Kasım 2026 · `6eb93a1` (ana şube kalır + ek gruplar; ödev, quiz, materyal, okuma yarışması ve grup mesajı üyelere de görünür)
- [x] Sınıf kodu ile katılım (öğrenci kendini sınıfa ekler, öğretmen onaylar) — *K-2* · 7 Kasım 2026 · `6eb93a1` (8 karakter Crockford Base32; öğretmen doğrudan da ekler)
- [x] **Okul yöneticisi rolü:** kendi okulunun öğretmen ve öğrencilerini yönetir — *K-12* · 7 Kasım 2026 · `6eb93a1` (süper admin verir; öğretmen onayı/pasife alma, bütün sınıflar, karneler)
- [x] Şube / kampüs katmanı (okul → şube → sınıf) — *K-12* · 7 Kasım 2026 · `6eb93a1` (isteğe bağlı kampüs; sınıf listesi kampüse göre süzülür)
- [x] Okul şablonları ve zümre klasörleri (branş öğretmenlerinin ortak alanı) — *K-12* · 7 Kasım 2026 · `6eb93a1` (Dosyalarım > Okul alanı; kopyalama ve ödeve ekleme)
- [x] **İyileştir:** Sınıf grubu mesajında kişi başına "okundu" bilgisi — *K-11 (bizde ek)* · 7 Kasım 2026 · `6eb93a1`

## 7. Etkileşimli tahta

- [x] Çizim tuvali: kalem, silgi, renk, kalınlık — *K-3* · 7 Kasım 2026 · `73358e2` (SVG, dış kütüphane yok; kalem, vurgu, silgi)
- [x] Geometrik şekiller (çizgi, ok, dikdörtgen, daire) — *K-3* · 7 Kasım 2026 · `73358e2` (Shift ile düz çizgi / kare / daire)
- [x] Şablon zeminler (kareli, çizgili, koordinat) — *K-3* · 7 Kasım 2026 · `73358e2` (düz, kareli, çizgili, noktalı, koordinat)
- [x] Tahtaya not kutusu ve görsel ekleme — *K-3* · 7 Kasım 2026 · `73358e2`
- [x] Geri al / yinele (50 adım) — *K-3* · 7 Kasım 2026 · `73358e2` (Ctrl+Z / Ctrl+Y; öğrenci katmanında da)
- [x] Her ekrana orantılı ölçekleme (sabit sanal çözünürlük) — *K-3* · 7 Kasım 2026 · `73358e2` (1920×1080)
- [x] Tahta ve öğrenci çizimi boyut sınırları — *K-3* · 7 Kasım 2026 · `73358e2` (tahta 5 MB, öğrenci çizimi 2 MB, 50 sayfa; veritabanında da)
- [x] Öğretmen düzenler, öğrenci görüntüler/çözer modu — *K-3* · 7 Kasım 2026 · `73358e2` (ödev türü Tahta: kopya dondurulur, öğrenci kendi katmanına çizer, öğretmen tek tek inceler)
- [x] Tahtaya **Mini Test** parçası (quiz motorunu kullanır) — *K-4* · 7 Kasım 2026 · `73358e2` (soru sunucuda dondurulur, doğru cevap tarayıcıya gitmez, sonuç Ödev kontrolü'ne)
- [x] Tahtaya **Cevabı Göster** parçası (sınav modunda sunucuda kapalı) — *K-4* · 7 Kasım 2026 · `73358e2` (o sorudan puan alınmaz)
- [x] Tahtaya **Adım Adım** çözüm parçası — *K-4* · 7 Kasım 2026 · `73358e2` (8 Kasım 2026 `cd89695` ile güçlendirildi: zaman çizelgesi, Sun kipi klavye bağlantısı, çok satırlı adım düzenleyici, sonuç adımı)
- [x] Tahtaya **Kronometre** parçası — *K-4* · 7 Kasım 2026 · `73358e2` (0 sn = ileri, değilse geri sayım)
- [x] Öğrenci çiziminin otomatik kaydı (30 sn) — *K-7* · 7 Kasım 2026 · `73358e2` (sekme gizlenince ve kapatınca da)
- [x] Ortak medya çekmecesinden tahtaya sürükle-bırak — *K-3* · 7 Kasım 2026 · `73358e2` (Dosyalarım ve kütüphane resimleri)
- [x] Tahtayı PDF/PNG olarak dışa aktarma (5. paketten taşındı) — *K-8* · 7 Kasım 2026 · `73358e2` (sayfa PNG, bütün sayfalar yazdır / PDF)

## 7b. Tahta: metin, gruplama, şekil kütüphanesi (bizde ek)

Hedef: Excalidraw'daki kütüphane gibi, hazır parçaların tahtaya **düzenlenebilir öğeler** (çizgi, şekil, metin) olarak geldiği bir Şekiller kütüphanesi. Sıra önemli: her iş bir öncekinin üstüne kurulur.

Ortak kararlar:
- Grup = öğelerde isteğe bağlı `groupId` alanı (ayrı kap öğesi yok, iç içe grup yok). Eski tahtalar olduğu gibi açılır.
- Kütüphane parçası = `{ id, name, category, elements: BoardEl[] }`; öğeler (0,0) başlangıçlı. Eklerken yeni kimlik + yeni `groupId` + bırakılan yere kaydırma. Önizleme resmi dosya değil, aynı öğelerden SVG olarak çizilir.
- Hazır setler kodla gelir (`src/lib/boardLibrary/`); bazıları "ayarlı" üretici olur (ör. sayı doğrusu: başlangıç, bitiş, aralık).

- [x] **Metin aracı**: zeminsiz yazı; yazı tipi (Düz / El yazısı / Başlık), boyut, kalın/ince/italik/altı çizili, renk, hizalama; seçiliyken yüzen biçim çubuğu; PNG'de yazı tipi gömülü · 8 Kasım 2026 · `9359545`
- [x] **Çoklu seçim**: sürükleyerek dikdörtgen seçim, Shift+tık; seçilenleri birlikte taşı, sil, kopyala (Ctrl+C/V, Ctrl+D) · 8 Kasım 2026 · `1aebe36`
- [x] **Gruplama**: Ctrl+G / Ctrl+Shift+G; gruba tıklayınca bütün grup seçilir, çift tıklayınca grubun içindeki tek öğe · 8 Kasım 2026 · `104ddfd`
- [x] **Şekiller kütüphanesi altyapısı**: medya çekmecesinde Şekiller sekmesi, arama + kategori, tıkla ya da sürükle-bırak ile grup olarak ekleme · 8 Kasım 2026 · `8c50edb`
- [x] Hazır set — **Matematik**: sayı doğrusu, koordinat düzlemi, kesir pastası ve çubukları, açıölçer, cetvel, üçgen/dörtgen çeşitleri, onluk taban blokları (çokgen öğesi eklendi) · 8 Kasım 2026 · `c9d0f9e`, `dd4558c`
- [x] **Ayarlı parçalar**: eklerken küçük pencere (sayı doğrusu aralığı, kesir dilim sayısı, ızgara satır/sütun) (eklenmiş parçanın ayarını değiştirme dahil) · 8 Kasım 2026 · `8e73e7d`
- [x] Hazır set — **Fen ve Genel**: devre elemanları, besin zinciri, hücre şeması; konuşma balonu, ok çeşitleri, tablo ızgarası · 8 Kasım 2026 · `edbab50`
- [x] **Kütüphaneme kaydet**: seçili öğeler → ad + kategori; Supabase tablosu, yalnızca sahibi görür (RLS), boyut sınırı · 8 Kasım 2026 · `3b50174`
- [x] **Formül desteği**: KaTeX ile kesir, üs, kök, denklem; düğmelerle ekleme (Metin, Not, Adım adım, Mini Test) · 8 Kasım 2026 · `65527bd`
- [x] **Grup ve çoklu seçimi köşeden ölçekleme** (ayarlı parçalarda ölçek korunur) · 8 Kasım 2026 · `acb8a86`
- [x] **Okul içi paylaşım**: öğretmen kütüphanesindeki parçayı okulundaki öğretmenlerle paylaşır · 8 Kasım 2026 · `b1df4cc`
- [x] **Metinde kelime bazında biçim (kalın/italik/altı çizili/renk/vurgu) ve listeler** · 8 Kasım 2026 · `575eca5`
- [x] **Metin kutusu (zemin/kenarlık/köşe), Okul yazı tipi (Andika), satır ve harf aralığı** · 8 Kasım 2026 · `f60c00c`

## 8. Güvenlik ve KVKK

- [ ] Admin şifresini değiştir (eski şifre git geçmişinde açık) — *K-14*
- [ ] Supabase: sızdırılmış şifre korumasını aç — *K-1*
- [~] Anonim öğrenci girişine CAPTCHA — *K-1, K-14* · kod hazır (`88e712e`, öğretmen/admin girişi ve kayıt da dahil); Turnstile anahtarı ve Supabase ayarı bekleniyor (docs/GUVENLIK.md)
- [x] **İşlem kaydı:** kim, ne zaman, neyi değiştirdi/sildi (eski ve yeni değerle) — *K-14* · 9 Kasım 2026 · `88e712e`, `51e0a24`
- [x] Erişim kaydı: kim hangi öğrencinin verisini görüntüledi — *K-15* · 9 Kasım 2026 · `88e712e`, `d2b8dd2` (PIN görüntüleme, dışa aktarma, öğrenci raporu)
- [x] Gizli anahtar sızıntı taraması (gitleaks) — *K-14* · 9 Kasım 2026 · `5e47c79`
- [x] PIN şifreleme anahtarını yenileme yöntemi — *K-14* · 9 Kasım 2026 · `23cd529`
- [x] Genel istek hız sınırları (giriş dışı uçlar) — *K-14* · 9 Kasım 2026 · `88e712e`
- [x] Yumuşak silme (yanlışlıkla silineni geri alma süresi) — *K-15* · 9 Kasım 2026 · `88e712e`, `cf9ae62`, `df54fe2` (yönetim paneli + öğretmen panelinde "Silinen öğrenciler", `d2b8dd2`)
- [x] Öğrenci verilerini dışa aktarma (KVKK talebi) — *K-15* · 9 Kasım 2026 · `88e712e`
- [x] Silme talebi akışı ve kaydı (unutulma hakkı) — *K-15* · 9 Kasım 2026 · `88e712e`
- [~] Aydınlatma metni ve veli açık rızası — *K-15* · `/aydinlatma` taslağı ve rıza kaydı hazır (`88e712e`); okul bilgileri ve hukuki onay bekleniyor
- [x] Supabase güvenlik ve performans uyarılarını (advisors) sıfırlama — *K-14* · 9 Kasım 2026 · `5e47c79` (bilerek bırakılanlar docs/GUVENLIK.md'de)

## 9. Kalite: test, CI, izleme

- [~] Uçtan uca testler: öğretmen kaydı → onay → giriş → puan → ödev → mesaj → çıkış — *K-17* · Playwright kuruldu, CI'da (`9640876`): sayfalar, giriş uyarıları, telefon taşması; öğretmen/öğrenci giriş-çıkış testi test hesabı (E2E_* gizli değişkenleri) bekliyor; kayıt→onay→puan zinciri test veritabanı bekliyor
- [x] Veritabanı kuralları (RLS) için otomatik yetki testleri — *K-17* · 9 Kasım 2026 · `4b382fc` (25 senaryo, hepsi geçti; CI'da TEST_DATABASE_URL ile)
- [x] CI: her commit'te tip kontrolü, lint ve build (GitHub Actions) — *K-17* · 9 Kasım 2026 · `6b2f029`
- [x] Hata izleme (ör. Sentry) — *K-16* · kendi hata kaydımız (dış servis yok, `ff9800e`); veritabanı 9 Kasım 2026 akşam uygulandı
- [x] Günlüklerde kişisel verinin gizlenmesi — *K-16* · 9 Kasım 2026 · `ff9800e` (hata kaydında e-posta/kimlik/sayı maskeleme; işlem kayıtlarında PIN ***)
- [x] Yedekleme ve geri yükleme planı — *K-16* · 9 Kasım 2026 · `989a384` (docs/YEDEKLEME.md; cron VPS'e geçişte kurulacak)
- [x] Büyük bileşenlerin bölünmesi ve Supabase tiplerinin otomatik üretilmesi — *K-17* · 9 Kasım 2026 · `3750d7c`, `e588234`, `ceef6cd` (tahta dosyaları bölündü; tipler üretildi, client'a bağlanması ayrı iş)

## 10. Canlı ders

- [x] Anlık quiz: öğretmen ders sırasında soruyu bütün sınıfa açar, cevaplar canlı gelir — *K-11* · 10 Kasım 2026 · `6ca6d4f`, `f6ab4d9` (doğru cevap öğretmen gösterene kadar öğrenciye gitmez)
- [x] Öğrenci çözümünü sınıfa yansıtma — *K-11* · 10 Kasım 2026 · `6ca6d4f`, `f6ab4d9` (öğrenci kendi defterine çizer, öğretmen seçtiğini yansıtır)
- [x] Öğrenciye süreli (30 sn) tahta kalemi izni — *K-11* · 10 Kasım 2026 · `6ca6d4f`, `f6ab4d9` (süre sunucuda denetlenir)
- [x] Sürükle-bırak eşleştirme etkinliği — *K-4, K-11* · 10 Kasım 2026 · tahta parçası “Eşleştirme” (sürükle ya da dokun-bırak, kontrol et; puansız)
- [x] Sesli not — *K-4, K-11* · 10 Kasım 2026 · `6ca6d4f`, `f6ab4d9` (mikrofondan en çok 3 dk ya da dosya; ödeve gönderilince ses de kopyalanır)
- [x] Tahtada eşzamanlı ortak çalışma — *K-11* · 10 Kasım 2026 · `6ca6d4f`, `f6ab4d9` (canlı derste “Ortak çalışma”: bağlı bütün öğrenciler aynı anda tahtaya yazar)
- [x] Tahta değişiklik geçmişi ve geri dönme — *K-11* · 10 Kasım 2026 · `6ca6d4f`, `f6ab4d9` (10 dakikada bir kopya, son 20 sürüm, 90 gün)

**İleride (canlı ders, 10 Kasım 2026 kararı — şimdilik yapılmayacak):**
- Ders sonu özeti: soru başına doğru/yanlış, öğrenci bazında; rapora ya da öğrenci gelişimine bağlanabilir (cevaplar zaten 30 gün tutuluyor)
- Derste yazılanları tahtaya kaydetme seçeneği (şimdi ders bitince çizimler siliniyor, tahta değişmiyor)
- Canlı sorudan doğru yapana otomatik puan

## 11. Topluluk / Keşfet

- [x] İçeriği (tahta/quiz/set) herkese açık paylaşma — *K-10* · 11 Kasım 2026 · `e2420e5` (bütün öğretmenlere; öğrenciler görmez; tahta ve soru seti)
- [x] Başka öğretmenin içeriğini kopyalayıp uyarlama, orijinal yazara atıf — *K-10* · 11 Kasım 2026 · `e2420e5` (kopyada kaynak; kopyadan paylaşılan orijinaline bağlanır)
- [x] Kopyalamadan önce hızlı önizleme — *K-10* · 11 Kasım 2026 · `e2420e5`
- [x] 1–5 yıldız ve favoriler — *K-10* · 11 Kasım 2026 · `e2420e5` (kendi içeriğine yıldız verilemez)
- [x] Kademe, branş, **MEB kazanım kodu** ve biçime göre arama — *K-10* · 11 Kasım 2026 · `e2420e5` (kazanım kodu ön ekle: MAT.5.1)
- [x] Trendler, en yüksek puanlılar, en çok kullanılanlar, en yeniler — *K-10* · 11 Kasım 2026 · `e2420e5` (trend: son 14 gün; puan ağırlıklı)
- [x] Editörün seçimi rozeti — *K-10* · 11 Kasım 2026 · `e2420e5` (yalnızca süper admin; gizleme de)
- [x] Paylaşım öncesi öğrenci adı/not taraması (KVKK) — *K-15* · 11 Kasım 2026 · `e2420e5` (okuldaki öğrenci adları, e-posta, telefon, 11 haneli no; görseller için onay)
- [x] Kopyalamada kota ayırma ve hata olursa geri alma — *K-9* · 11 Kasım 2026 · `e2420e5` (500 MB; 15 dk rezervasyon)

**İleride (altyapı, 11 Kasım 2026 konuşması — şimdilik yapılmayacak):**
- Supabase'i okullar kullanmaya başlamadan Pro'ya geçirmek (ücretsiz plan 1 hafta kullanılmazsa duraklar, ~200 eş zamanlı bağlantı)
- Canlı ders çizimlerini Realtime Broadcast'e taşımak (ortak çizimde veritabanı yükünü düşürür)
- Gece yedeğini Hostinger Business paketine (200 GB) göndermek
- Dosyaları kendi sunucumuza (VPS) taşımak: yetki Supabase'de kalır, dosya kapısı VPS'te; Supabase trafik kotasını rahatlatır (2–4 gün)

## 12. Yapay zekâ

- [ ] Soru hazırlama asistanı: kazanım + seviye → soru taslağı, öğretmen onayı zorunlu — *K-13*
- [ ] Kazanım bazında eksik analizi haritası — *K-13*
- [ ] Öğrenciye özel çalışma kâğıdı — *K-13*
- [ ] Açık rıza ve kişisel verinin modele gönderilmemesi (anonimleştirme) — *K-13*
- [ ] Prompt injection savunması; otomatik puanlama yok — *K-13*

---

## Bitenler (kronolojik)

| Tarih | İş | Commit |
|---|---|---|
| 6 Kasım 2026 | Duyurular okula göre ayrıldı (Paket 0) | `1a759ab` |
| 6 Kasım 2026 | Sınıflarım açıklaması düzeltildi, YOL_HARITASI güncellendi (Paket 0) | `d40a0f4` |
| 6 Kasım 2026 | Rastgele öğrenci seçici (Paket 1) | `fc2a2ca` |
| 6 Kasım 2026 | Kronometre (Paket 1) | `21ec5fc` |
| 6 Kasım 2026 | Geri sayım (Paket 1) | `1118a0b` |
| 6 Kasım 2026 | Grup oluşturucu; araçların görsel kontrolü ve akıllı tahta uyumu — Paket 1 tamam | `c241991` |
| 6 Kasım 2026 | Ödevi birden çok sınıfa verme (Paket 2) | `ef590a3` |
| 6 Kasım 2026 | Teslim saati ve geçmiş tarih engeli (Paket 2) | `71f5852` |
| 6 Kasım 2026 | Sonuçları açıklama: hemen / sonra açıkla (Paket 2) | `23081db` |
| 6 Kasım 2026 | Öğrenci teslimi, teslim kilidi, otomatik kapanış, teslim özeti, dosya içeriği doğrulaması — Paket 2 tamam | `50a8def` |
| 7 Kasım 2026 | Dosyalarım, klasörler, etiketler, Dosyalarımdan ekle, sınıfla paylaşım, kota, setler, ortak kütüphane — Paket 3 tamam | `07bec54` |
| 7 Kasım 2026 | Quiz motoru: soru bankası, alıştırma ve sınav modu, sunucuda değerlendirme, sonuç ekranları — Paket 4 tamam | `c8a8d9e` |
| 7 Kasım 2026 | Isı haritası, sınıf karnesi, öğrenci gelişimi, Excel/PDF/PNG dışa aktarma, quiz cevaplarını inceleme — Paket 5 tamam | `b7879b1` |
| 7 Kasım 2026 | Ek gruplar ve sınıf kodu, okul yöneticisi, kampüs, okul alanı/zümre, grup mesajında okundu — Paket 6 tamam | `6eb93a1` |
| 7 Kasım 2026 | Etkileşimli tahta: çizim, şekil, zemin, not/görsel, parçalar, sunum, ödev olarak çözme, PDF/PNG — Paket 7 tamam | `73358e2` |
| 8 Kasım 2026 | Soru bankası ve quiz: formül ve zengin metin (ortak RichTextField, tahtayla aynı altyapı) | `a8d7ea5` |
| 9 Kasım 2026 | Güvenlik ve KVKK: Supabase uyarıları, gitleaks, PIN anahtarı yenileme, işlem kaydı, hız sınırları, silinenler kutusu (30 gün), dışa aktarma, veli talepleri ve kalıcı silme (Paket 8, 8/13) | `5e47c79`, `23cd529`, `88e712e`, `cf9ae62`, `df54fe2`, `51e0a24` |
| 9 Kasım 2026 | Kalite: CI, yetki testleri, uçtan uca testler, yedekleme planı, hata kaydı, tahta dosyalarının bölünmesi, Supabase tipleri; öğretmen panelinde Silinenler ve erişim kaydı (Paket 9, 5/7; Paket 8, 9/13) | `6b2f029`, `989a384`, `4b382fc`, `9640876`, `ff9800e`, `3750d7c`, `e588234`, `ceef6cd`, `d2b8dd2` |
| 10 Kasım 2026 | Canlı ders: anlık quiz, çözüm yansıtma, 30 sn kalem izni, ortak çalışma; tahtaya eşleştirme ve sesli not; tahta sürüm geçmişi. Veritabanı testi 41/41 (`supabase/tests/live_test.sql`); test kalem izni denetiminde bir açık yakaladı, düzeltildi (Paket 10, 7/7) | `6ca6d4f`, `f6ab4d9`, `b5276a3` |
| 11 Kasım 2026 | Topluluk / Keşfet: tahta ve soru seti paylaşma, kişisel veri taraması, önizleme, kota ayırmalı kopyalama, atıf, yıldız, favori, kazanım koduyla arama, sıralamalar, editörün seçimi. Veritabanı testi 30/30 (`supabase/tests/community_test.sql`) (Paket 11, 9/9) | `e2420e5` |
