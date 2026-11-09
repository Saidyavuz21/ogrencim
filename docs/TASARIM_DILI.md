# e-Okul Portalı — tasarım dili önerisi

Tarih: 3 Kasım 2026. Durum: kaynak kod incelemesi ve kullanıcının yön tercihine dayalı ilk öneri. Giriş ve öğretmen kaydı ekranlarına ilk uygulama yapıldı; diğer paneller henüz uyarlanmadı. Uygulanan değerler kökteki DESIGN.md içinde kayıtlıdır. Bu belge ilk incelemeyi ve genel öneriyi korur; uygulanan giriş ekranının kaynak kod kaydı DESIGN.md dosyasındadır.

## İnceleme bulguları

> Arşiv notu — 9 Kasım 2026: Bu dosya ilk öneriyi saklar; aşağıdaki bulgular güncel uygulamanın tarifi değildir. Yeni arayüzler için bağlayıcı kaynaklar [DESIGN.md](../DESIGN.md) ve [UI_KURALLARI.md](UI_KURALLARI.md) dosyalarıdır. Eski yatay modül menüsü gibi ilk öneriler tekrar uygulanmamalıdır.

- globals.css yalnızca zemin/metin değişkenlerini içeriyor; çoğu renk ve ölçü bileşenlerin içinde tekrar tanımlanıyor.
- layout.tsx Tailwind'i tarayıcı betiğiyle yüklüyor. Geist değişkenleri tanımlı ancak font-sans bunlara açıkça bağlanmamış; gerçek yazı tipi tarayıcıdan doğrulanmalı.
- AuthPage.tsx öğrenci için indigo, öğretmen için mavi, yönetici ve giriş işlemi için koyu slate kullanıyor. Ortak ana eylem rengi belirgin değil.
- TeacherDashboard.tsx dokuz modülü uzun, yatay kayan sekmelerle sunuyor. Küçük ekranlarda keşif ve erişim riski var.
- Panelde bazı öğrenci sayıları 28 olarak sabit. Bütün sayaçların seçili sınıf ve gerçek listeyle tutarlı olması gerekiyor.
- Çok sayıda yardımcı metin 10–12 px. Ders sırasında hızlı okuma açısından incelenmeli.
- Bazı tıklanabilir hızlı erişim kartları div olarak yazılmış; klavye ve etkileşim semantiği eksikleri ortak bileşenlerde çözülmeli.
- Kart, alan ve düğmelerin köşe, boşluk, odak ve durum stilleri tekrarlanıyor.
- BottomNav.tsx içinde sabit sıralama rozetleri var. Sıralama okunmamış bildirim gibi sunulmamalı; gerçek veriden gelmeli.

Sınır: Bu aşamada tarayıcı görüntüsü alınmadı. Mobil taşma, hesaplanan karşıtlık ve gerçek yazı tipi doğrulanmadı. Yerel node_modules/next/dist/docs/ dizini bulunamadı; uygulama koduna dokunulmadı.

## Önerilen yön: Sınıf Atölyesi

Sıcak, destekleyici, düzenli ve okunaklı bir okul portalı. Öğretmenin ders sırasında hızlı işlem yapabilmesi temel ölçüttür. Sıcaklık kırık beyaz yüzeylerden, derin yeşil vurgudan ve öğrenci gelişimini destekleyen dilden gelir. İsim, durum ve sıradaki işlem görünür kalır.

Kullanıcı sıcak/öğrenci odaklı yönü ve öğretmen paneli önceliğini seçti. Sınıf Atölyesi adı, aşağıdaki palet ve yerleşim uygulama önerisidir.

## Renk rolleri — öneri

- Sayfa: #F7F6F2; ana yüzey: #FFFFFF; ikincil yüzey: #F0EEE7.
- Ana metin: #20352D; yardımcı metin: #58665F; kenarlık: #DEDAD0.
- Ana eylem/etkin gezinme: #25634B, beyaz metin; hover: #1D503D.
- Seçili yüzey: #E6F1E9, koyu yeşil metin.
- Tamamlandı: #216044 metin, #E8F3EB yüzey.
- Dikkat/kısmen: #805217 metin, #FFF3D6 yüzey.
- Hata/eksik: #A33342 metin, #FCECEF yüzey.

Ana eylem rengi role göre değişmez. Durumlar renk yanında metin/simge taşır. Altın tonu dikkat gerektiren işlerde kullanılır. Bütün eşleşmeler uygulamada karşıtlık kontrolünden geçer.

## Tipografi — öneri

- Mevcut Geist Sans ortak font değişkenine bağlanır; yeni font bağımlılığı gerekmiyor. Türkçe karakterler doğrulanır.
- Sayfa başlığı: 28 px, mobil 24 px; ağırlık 650–700.
- Bölüm başlığı: 20 px, mobil 18 px; ağırlık 600.
- Ana metin ve form alanı: 16 px; yaklaşık 1.5 satır yüksekliği.
- Yoğun tablo ve düğme: 14 px; yardımcı metin: 13 px.
- Kritik yönergeler dipnota dönüşmez. Sayılarda tabular rakamlar; kalınlık yalnızca hiyerarşi ve önemli değerler için.

## Mobil öncelik — kullanıcı kararı

Portal çoğunlukla telefondan kontrol edilecek. Mobil kullanım ve ferah yerleşim bağlayıcı gereksinimdir; renk ve kompozisyon önerilerinden bağımsız olarak sonraki bütün ekranlarda korunur.

- Önce 360–430 px telefon düzeni tasarlanır; tablet ve masaüstüne genişletilir.
- Sayfa yan boşluğu en az 16 px; ana bölümler arasında 24 px, panel içinde 16–20 px hedeflenir.
- Ana düğmeler ve sık kullanılan durum kontrolleri en az 48 px yüksekliğinde; komşu dokunma alanları arasında en az 8 px boşluk bırakılır.
- Gövde ve form metni 16 px kalır. Daha çok bilgi sığdırmak için yazı küçültülmez.
- Sınıf, ödev ve filtre alanları üst üste gelir. İkincil ayrıntılar açılır bölümlerde sunulur; temel görev ve öğrenci durumu görünür kalır.
- Öğrenci listesi telefonda ad ve durumun üstte, işlemlerin ayrı satırda olduğu ferah satırlar kullanır. Ana ödev kontrol akışı yatay kaydırmaya bağlı olmaz.
- Uzun modül sekmeleri yerine etiketli modül menüsü; az sayıda sık kullanılan hedef için alt gezinme kullanılır. Aynı hedefler gereksiz yere tekrarlanmaz.
- Telefon klavyesi açıkken form, hata mesajı ve kaydetme eylemine erişim korunur. Sabit alt alan içerik, klavye odağı ve güvenli alanla çakışmaz.
- Modal içerik telefonda gerektiğinde tam ekran açılır; uzun formlar dar bir kutuya sıkıştırılmaz.
- Kabul kontrollerinde 360, 390 ve 430 px önceliklidir; uzun adlar, metin büyütme, açık klavye ve dikey kaydırma ayrıca değerlendirilir.

## Yerleşim ve biçim — öneri

- Boşluk ölçeği: 4, 8, 12, 16, 24, 32, 48 px.
- Kontrol köşesi: 10 px; panel: 16 px; rozet: 6 px.
- Form ve ana düğme yüksekliği en az 44 px; mobil simge düğmeleri de yeterli dokunma alanı alır.
- İnce kenarlık ve yüzey tonu ana ayrım araçlarıdır. Belirgin gölge modal ve menülerde kullanılır.
- 1024 px ve üzeri: dar sol modül gezinmesi, esnek çalışma alanı.
- 768–1023 px: açılır modül menüsü ve geniş çalışma alanı.
- 768 px altı: tek sütun, üst üste sınıf/ödev seçimi, uzun sekme dizisi yerine etiketli modül seçici.
- İkincil, geniş veri tabloları gerektiğinde kendi bölgesinde yatay kayabilir; sayfa bütünü kaymaz. Ana öğrenci kontrol akışı telefonda satır düzenine dönüşür ve yatay kaydırma gerektirmez.
- Sabit kontroller içerik ve klavye odağını örtmez; mobil alt güvenli alan hesaba katılır.

## İlk uygulama: Öğretmen / Ödev Kontrolü

1. Öğretmen bilgisi ve etiketli sınıf seçimi.
2. Kısa modül adları: Ödev kontrolü, Öğrenci puanları, Ödevler, Değerlendirme, Sınıflar, Not girişi, Mesajlar, Sıralama.
3. Çalışma bağlamı: seçili ödev, ders, teslim tarihi. Filtre etkilediği listenin yanında bulunur.
4. Sonuç özeti gerçek listeden hesaplanır. Tamamlandı, kısmen, eksik ve kontrol edilmedi ayrı durumlardır.
5. Öğrenci satırında ad, durum, açık etiketli durum seçimi ve gerekiyorsa puan bulunur. Arama sonucu yoksa filtreyi temizleme eylemi sunulur.
6. Ana işlem: Kontrolü kaydet. Veliye iletme varsa kapsamı belirtilir; gerçek teslim doğrulanmadan İletildi denmez.

Ayırt edici etkileşim: durum değişen öğrenci satırının kısa vurgusu ve özetin eşzamanlı güncellenmesi. Kaydedilmedi ve Kaydedildi ayrı görünür. Hareket 120–180 ms; azaltılmış hareket tercihinde kaldırılır. Bunlar hedef davranışlardır, mevcut işlev garantisi değildir.

## Ortak bileşen sözleşmesi

- Button: primary, secondary, ghost, danger; loading, disabled ve görünür klavye odağı. İşlem bölgesinde baskın tek ana eylem.
- Field: kalıcı etiket, açıklama, bağlantılı hata; yer tutucu etiket yerine geçmez.
- StatusBadge: renk + metin; başarı, bekliyor, hata ve kontrol edilmedi ayrı.
- Panel: başlık, açıklama, içerik ve isteğe bağlı eylem; her küçük değer ayrı karta dönüşmez.
- ModuleNavigation: etkin modül, gerçek sayaç, klavye desteği ve mevcut rol sınırları.
- StudentRow: uzun ad, durum, puan ve mobil davranış birlikte tanımlanır.
- Dialog: başlık, kapatma, ilk odak, odak sınırı, Escape, kapanışta odağı geri verme.
- Feedback: yükleniyor, boş, hata, başarı ve kaydedilmemiş değişiklik. Başarı gerçek işlem sonucuna bağlıdır.

Bu aile henüz uygulanmış bir UI kütüphanesi değildir.

## Dil ve veri kuralları

- Kısa eylemler: Ödev oluştur, Kontrolü kaydet, Mesaj gönder.
- Dil öğrenci gelişimini destekler. Sıralama, not ve davranış puanı birbirinin yerine geçmez.
- Boş listede neden ve sonraki eylem: Bu sınıfta henüz ödev yok. Ödev oluştur.
- Hata girdiyi silmez; yeniden deneme sağlar.
- Örnek/sabit veri gerçek sayı gibi sunulmaz. Tarih, yüzde ve puan aynı kapsamdan hesaplanır.
- Toplu işlem etkilenen öğrenci/alıcı sayısını gösterir. Yıkıcı eylem ayrı görünür ve sonucunu açıklar.

## Uygulama sırası ve kabul

1. Öğretmen Ödev Kontrolü ekranında somut örnek.
2. Ortak CSS değişkenleri ve ihtiyaç sırasıyla bileşenler. Uygulama kodundan önce kurulu Next.js sürümünün ilgili yerel rehberleri okunur.
3. İlk örnek üzerinden giriş ve diğer rollerin uyarlanması.
4. Uygulanmış değerlerden DESIGN.md ve .impeccable/design.json üretilmesi. Bu öneri dosyası uygulanmış sistem diye etiketlenmez.

Kabul ölçütleri: öncelikle 360, 390 ve 430 px telefon, ardından 768 ve 1440 px görünüm; klavye erişimi ve görünür odak; normal metinde en az 4.5:1 karşıtlık; yüzde 200 yakınlaştırmada içerik kaybı olmaması; uzun Türkçe adlar; boş/yüklenme/hata durumları; sınıf/ödev değişiminde tutarlı sayaçlar; mevcut kayıt ve yetki akışlarının korunması. Uygulama kodu değiştiğinde uygun lint/build kontrolleri çalıştırılır.



## Güncel uygulama önceliği

Kullanıcı ilk uygulamayı öğretmen panelinden giriş ve kayıt ekranına çevirdi. AuthPage.tsx ve AuthPage.module.css güncellendi. Öğretmen Ödev Kontrolü bir sonraki uygulama alanıdır. Tarayıcı görsel doğrulaması bu ortamda tamamlanamadı.

