---
name: tofutr — Sınıf Atölyesi
description: Sıcak nötr yüzeyler, ölçülü yeşil vurgu, masaüstü ve mobil için ortak öğretmen arayüzü.
colors:
  background: "#f7f6f2"
  surface: "#ffffff"
  text: "#20352d"
  muted: "#58665f"
  border: "#dedad0"
  divider: "#eeece5"
  control-border: "#a4b1a6"
  primary: "#25634b"
  primary-hover: "#1d503d"
  selected: "#e6f1e9"
  success-text: "#216044"
  success-surface: "#e8f3eb"
  warning-text: "#805217"
  warning-surface: "#fff3d6"
  error-text: "#a33342"
  error-surface: "#fcecef"
typography:
  body:
    fontFamily: "var(--font-geist-sans), Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  page-title:
    fontSize: "22px"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-.02em"
  section-title:
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.4
  label:
    fontSize: "14px"
    fontWeight: 500
rounded:
  control: "10px"
  panel: "18px"
  mobile-panel: "16px"
spacing:
  small: "8px"
  medium: "16px"
  section: "24px"
  large: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "10px 14px"
  panel:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text}"
    rounded: "{rounded.panel}"
    padding: "24px"
  auth-button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.control}"
    padding: "14px 16px"
    height: "52px"
---

# Design System: tofutr

## Overview

**Creative North Star: "Sınıf Atölyesi"**

Sıcak, sakin ve işlev odaklı bir okul portalı. Öğretmenin ders sırasında hızlı işlem yapması, öğrenci adlarının ve sonraki işlemin okunaklı olması esastır. Yeni öğretmen sayfaları bu sistemin devamıdır; bağımsız bir görsel tema oluşturulmaz.

Güncelleme: 9 Kasım 2026. Kaynak: kullanıcının seçtiği ve kaynak koda uygulanan öğretmen paneli kararları. Ayrıntılı uygulama kuralları: [docs/UI_KURALLARI.md](docs/UI_KURALLARI.md). Eski yatay modül menüsü tarifi artık geçerli değildir. Giriş/kayıt ekranı aşağıdaki ayrı ölçülerini korur; öğrenci ve yönetici ekranlarının tamamının yenilendiği varsayılmaz.

**Key Characteristics:**
- Sıcak kırık beyaz zemin, beyaz yüzey, ölçülü yeşil vurgu.
- İnce ayırıcılar ve kompakt listeler; tekrar eden büyük başlık kutuları yok.
- Ortak gezinme; masaüstü ve mobilde işleve uygun farklı yerleşimler.

Doğrulama sınırı: kaynak kod ve kullanıcının ekran görüntüleri esas alındı. Bütün sayfaların tarayıcıda tüm boyutlarda görsel olarak doğrulandığı iddia edilmez. Kod kontrolü görsel onay yerine geçmez.

## Colors

Frontmatter ana palettir. Öğretmen kabuğunda mevcut `--teacher-*` değişkenlerini kullan.

### Primary

Derin yeşil ana eylem ve seçili gezinme içindir. Açık yeşil seçili yüzeydir. Kullanıcı baskın mavi yönünü reddetti; yeni ekranlara mavi ağırlıklı tema getirme. Mor/sarı yalnızca küçük araç işaretleri gibi yardımcı alanlarda kullanılabilir. Başarı, uyarı ve hata metin/ikonla da ifade edilir; sayaç uyarıları gibi işlevsel renkler korunur.

### Neutral

Sayfa `#f7f6f2`, panel beyaz, metin `#20352d`, yardımcı metin `#58665f`; panel sınırı `#dedad0`, liste ayırıcısı `#eeece5`.

## Typography

Geist Sans CSS değişkeni ve mevcut yedekler kullanılır; yeni font eklenmez. Sayfa başlığı masaüstünde 22 px / mobilde 20 px, ağırlık 600. Panel başlığı 18–20 px / 600; liste adı 14–16 px / 500; yardımcı metin 12–14 px. Mobil giriş alanlarının fontu 16 px kalır. Uzun öğrenci, sınıf ve dosya adları satıra yayılır. Puan, sıra ve sayaçlarda tabular rakamlar kullanılır.

## Layout

Ortak kabuk: `TeacherDashboard`, `TeacherTopBar`, `TeacherSidebar`, `TeacherMobileNav`, `TeacherPageHeader`. Yeni sayfa bu kabuğa eklenir; ikinci header/sidebar üretilmez.

Masaüstü öğretmen üst çubuğunun tam ortasında Topluluk / Sınıf araçlarım / Tahtalarım sekme görünümünde hızlı bağlantılar bulunur. Bu üç bağlantı sidebar içinde de kalır; mobil gezinme korunur.

- Masaüstü kabuğu 1024 px ve üstüdür. Sidebar grid kolonları açıkken 264 px, daraltıldığında 104 px; bunlar dış boşluğu da içerir.
- Header geniş tek beyaz yüzeydir. Logo/sınıf solda; mesaj, bildirim ve profil sağda. Öğeleri 1200 px ortalanmış dar kümeye sıkıştırma. Geniş ekranda 48 px, 1024–1199 px arasında 32 px yatay iç boşluk vardır.
- İçerik header'dan bağımsızdır. Genel `.dashboard` 1152 px; yenilenen çalışma alanları en fazla 1560 px kullanır. Benzer sayfanın kapsamlı seçicilerini izle; bütün sayfaları yanlışlıkla yeniden boyutlandırma.
- Panel içi masaüstünde 22–24 px, mobilde 16–18 px; panel arası masaüstünde 20–24 px, mobilde 16–18 px.
- 1024 px altında üstte logo yanında menü ikonu, yandan çekmece, altta **Ana sayfa / Sınıf araçları / Mesajlar / Menü** bulunur. Sınıf araçları dört aracı açan menüdür.
- Sayfaya özel içerik kırılımlarında mevcut 640/767/768 px eşikleri izlenir. Mobil alt menü ve güvenli alan için boşluk ayrılır; kaydet/toplu işlem çubukları alt menüyü örtmez.
- Alt sayfalarda küçük, çerçevesiz H1; büyük ikonlu başlık kartı ve gereksiz Ana sayfa geri bağlantısı yok. Gerekli mobil sınıf seçimini koru. Ödev gönder başlığı altında ikinci sınıf seçici yok; formun hedef sınıf seçimi ayrıdır.
- Mobil ana sayfadaki yeşil okul/öğretmen/sınıf paneli kullanıcının özellikle koruduğu istisnadır.

Giriş/kayıt istisnası: tek sütun, en fazla 520 px içerik; mobilde 20 px, 540 px üstünde 32 px panel dolgusu. Alanlar ve ana düğme 52 px; PIN kutuları 52 × 56 px. Bu genişlik öğretmen dashboard'una taşınmaz.

Herkese açık ana sayfa (`HomePage`) masaüstünde en fazla 1360 px ana içerik ve 40 px yatay dolgu kullanır. Solda büyütülmüş mevcut `/images/okul-bahcesi.png` illüstrasyonu, sağda en fazla 520 px giriş kartı bulunur. Tanıtım başlığı ve açıklama bu iki alanın hemen altında tam genişlikte, beyaz bir kartta yer alır: 26–36 px başlık, 600 ağırlık, 1.3 satır yüksekliği; 26 × 32 px dolgu ve 16 px köşe. Mobilde bu tanıtım kartı gizlidir. Giriş kartı 16 px köşeli ve 32 px dolguludur. 761–1050 px arasında yatay içerik ve kart dolgusu 24 px olur.

**The Giriş Önceliği Rule.** Herkese açık ana sayfada 760 px ve altında tanıtım başlığı, açıklaması, illüstrasyonu ve materyal listesi gizlenir. Kompakt logo/menü başlığı, giriş kartındaki görünür “Hoş geldiniz” ve açıklaması, rol seçimi ve tek giriş formu kalır. Kart dolgusu dikey 24 px / yatay 20 px, dış yatay boşluk 16 px olur. Site bağlantıları açılır menüdedir; kayıt bağlantısı kartın, topluluk bağlantısı kartın altındadır. Bu kırılım öğretmen/öğrenci paneline veya ayrı giriş/kayıt sayfasına genellenmez.

## Elevation & Depth

İçerik panelleri ince kenarlıkla ayrılır; ağır gölge kullanılmaz. Header ve popup'ta mevcut hafif gölgeler kullanılabilir: header `0 3px 12px rgb(32 53 45 / 4%)`, popup `0 8px 24px rgb(20 35 28 / 12%)`. Dekoratif cam/blur veya parlama ekleme.

## Shapes

Kontroller 8–12 px, ana paneller masaüstünde 18 px / mobilde 16 px köşelidir. Yuvarlak avatar ve küçük pastel araç ikonları mevcut sistemin parçasıdır. Giriş ekranına ait şekil kısıtları bütün öğretmen paneline genellenmez.

## Components

### Herkese açık ana sayfa

- Rol seçimi iki eşit parçalıdır; seçili öğrenci/öğretmen açık yeşil yüzey, ince yeşil sınır ve koyu yeşil metinle gösterilir. Varsayılan rol öğrencidir. Mevcut `StudentSchoolSelect`, okul numarası ve dört haneli PIN akışı korunur; öğretmende e-posta/şifre ve şifre görünürlüğü bulunur. Yeni bir “Şifremi unuttum” akışı uydurulmaz.
- Metin alanları ve ana giriş düğmesi 52 px; PIN kutuları 52 × 56 px ve araları 12 px kalır. Gönderim kilidi, PIN odak/yapıştırma, CAPTCHA ve gerçek hata durumları görsel düzenlemeyle değiştirilmez.
- Masaüstü topluluk bölümü mevcut herkese açık galeriden en fazla üç gerçek materyal gösterir. Yükleme, boş sonuç ve hata birbirinden ayrılır; örnek materyal veya başarı iddiası eklenmez. Mobilde bunun yerine tek topluluk bağlantısı vardır.
- Herkese açık sayfalar ortak `SiteFooter` kullanır: beyaz zemin, ince üst çizgi, solda mevcut logo ve kısa metin; sağda Platform / Destek / Kurallar ve gizlilik bağlantıları. İçerik 1360 px ile sınırlıdır; masaüstünde 36 × 40 px üst/yatay dolgu vardır. 760 px altında marka üstte, Platform ve Destek iki sütunda; hukuk grubu altta iki sütun bağlantıyla gösterilir. Bütün bağlantılar görünür ve en az 44 px dokunma yüksekliğindedir.

Kayıt dayanağı (11 Kasım 2026): `src/components/home/HomePage.tsx`, `HomePage.module.css`; `.impeccable/review/home-desktop.png`, `home-desktop-teacher.png`, `home-mobile-360.png`, `home-mobile-390.png`, `home-mobile-430.png`. Görseller masaüstünde iki rolü ve mobilde öğretmen görünümünü gösterir; başarılı canlı giriş veya galeride dolu sonuç doğrulaması değildir.

Profilim/Hesabım masaüstü yerleşimi: `TeacherProfile.module.css` ortak sayfa kabuğunun bütün içerik genişliğini kullanır; içeride ayrı bir 1120 px sınırı yoktur. Solda 280 px genişliğinde, fotoğraf kontrolleri ve bölüm menüsünü içeren kalıcı bir panel; sağda kalan genişliği kullanan içerik bulunur. Hesap bilgileri, Topluluk profili ve Güvenlik arasında geçişte profil resmi yerinde kalır. Hesap alanları uygun genişlikte iki sütuna çıkar. Topluluk ayarları fotoğraf kontrollerini tekrar etmez. Diğer kullanım yerleri ve 1024 px altındaki mobil yerleşim korunur.

### Süper admin paneli

Genel bakış ve 13 alt sayfa mevcut yönetici üst menüsü/yan menüsüyle aynı yeşil ve sıcak nötr dili kullanır. `AdminDashboard.module.css` içindeki `.adminShell` kabuğu; `AdminManagement.module.css` yalnızca yönetim listeleri, formları ve pencereleri için kullanılır.

- Alt sayfa başlığı çerçevesiz 22 px / mobilde 20 px ve 600 ağırlıktadır. İçerik en fazla 1440 px; paneller masaüstünde 24 px, mobilde 18 × 16 px dolguludur.
- Başvurular, kullanıcılar, okullar, sınıflar, KVKK ve kayıtlar beyaz yüzeylerde ince ayırıcılı satırlardır. Durumlar renkli metin/rozetle belirtilir; bütün satır uyarı kartına dönüştürülmez.
- Mobilde kimlik ve işlemler ayrı satırlara geçer. Düğmeler ve sayfalama en az 44 px; giriş alanları 16 px font kullanır. Sayfa başına kayıt sayısı `CustomSelect` ile seçilir.
- Okul → sınıf → öğrenci gezinmesi, PIN gösterme, onay/red, birleştirme, silme/geri alma ve hesap işlemlerinin mevcut davranışı korunur.
- Yönetici kütüphanesinin stilleri `.adminShell` kapsamındadır; öğretmen kütüphanesinin görünümü değişmez. Yönetici duyuruları mevcut form/liste yerleşimini kullanır; topluluk ve hesap sayfaları güncel ortak bileşenleri korur.

Görsel kontrol sınırı: yerel önizleme ve test verileri; canlı yönetici oturumu veya gerçek kayıt işlemi doğrulaması değildir.

### Öğrenci paneli

Öğrenci panelinin ana sayfası ve 12 alt sayfası aynı yeşil/sıcak nötr sistemi kullanır. Öğrenciye özel sunum `src/components/student/StudentPortal.module.css` içinde `.portal` kapsamında tutulur; ortak öğretmen ve yönetici stilleri değiştirilmez.

- Mevcut öğrenci üst menüsü ve gruplu yan menü korunur. Mobil hızlı menü **Ana sayfa / Ödevler / Mesajlar / Hesabım** şeklindedir; diğer sayfalar çekmeceden erişilir.
- Alt sayfalarda çerçevesiz 22 px / mobilde 20 px başlık ve kısa açıklama vardır. Tekrar eden büyük başlık kartı ve geri düğmesi kullanılmaz.
- Ana sayfadaki yeşil kimlik alanında okul/sınıf bilgisi ve gerçek puan, sıra ve bekleyen ödev sayısı yer alır. Sayfa bağlantıları gruplu, ince ayırıcılı listelerdir.
- Ödev teslimi, notlar, puan geçmişi, materyaller, sınıflar, duyurular ve hesap sayfaları ortak panel ölçülerini kullanır. Gelişim raporundaki öğrenci görünümü `self` ile sınırlandırılır; öğretmen raporunun sunumu korunur.
- Mobilde içerik alt menü ve güvenli alan kadar boşluk bırakır. Materyal filtreleri tek sütuna iner; uzun adlar satıra yayılır. Rapor tabloları etiketli, klavyeyle odaklanabilen yatay kaydırma alanında kalır.
- Akvaryum sahnesi, quiz/tahta oynatıcıları ve canlı dersin kendi etkileşimleri ve tam ekran davranışları korunur.

Doğrulama kapsamı: yerel öğrenci önizlemesinde test verileriyle masaüstü ve mobil yerleşimler; gerçek öğrenci oturumu ve canlı sunucu doğrulaması değildir.

Bahçe görünümü (`GardenPlot`) mevcut yeşil/sıcak nötr dil içinde, ağaçları masaüstünde yakın ve çapraz kümeler halinde; 640 px ve altı ekranlarda veya 560 px ve altı bileşen genişliğinde iki kollu çapraz düzende gösterir. Büyük bahçe evi ağaçlarla orantılıdır; kıvrımlı patika eve bağlanır, gölet evin yanında yer alır. Kelebekler ayrı rotalarda uçar; azaltılmış hareket tercihinde animasyon durur. Davranış adları kesilmeden satıra yayılır; büyüme aşaması ve sulama hakkı gerçek veriden gelir. Henüz dikilmemiş yuvalar boş durum olarak ayırt edilir. Mevcut seviye eşikleriyle açılan manzara süsleri ve ağaç seçme/sulama davranışı korunur; bu sahnenin renkleri ve yerleşimi diğer panellere genellenmez.

Çiçek kazanımı ev önü/patika tarhları ve seyrek arıları; ev kazanımı sulama kovası/el arabasını; gölet kazanımı ördek ve su halkalarını da gösterir. Bunlar dekoratiftir; yeni puan veya seviye eşiği eklemez. Arı, ördek ve halka hareketleri azaltılmış hareket tercihinde durur.

- Tekli açılır seçeneklerde `CustomSelect`; yeni native `<select>` ekleme. Çoklu seçim tekli seçime indirgenmez; Ödev gönder başlığındaki checkbox menüsü örnektir.
- İkonlar `src/components/icons.tsx` üzerinden, tutarlı ölçü ve çizgi ağırlığıyla gelir. Küçük ikonlar 16–20 px, ana araçlar 20–24 px; emojiyle ikon taklidi yapma.
- Listede kimlik solda, işlem sağda; satırlar ince çizgiyle ayrılır. Mobilde işlem metni gizlenebilir; erişilebilir ad ve en az 44 × 44 px alan korunur.
- Tekli tür/sekme seçiminde yalnızca biri etkin görünür. Mobil Ödev/Quiz/Tahta üç eşit parçalı seçimdir; açıklama altta seçili türü anlatır.
- Ana sayfa 2 × 2 Sınıf araçlarında yatay/dikey ince ayırıcılar bulunur. "Yeni tur" gibi kısa işlem etiketleri ikonuyla tek satırda kalır.
- `Notice`, `Spinner`, mevcut `Modal` / `useDialog`, `CollapsiblePanel`, `ClassLevelSelects` ve alan desenlerini yeniden kullan. Etiket, yükleme, disabled, hata ve boş durumları gerekir.
- Giriş/kayıtta rol seçimi, şifre görünürlüğü, PIN odak/yapıştırma desteği, istek sırasında kilitleme ve yönetim onayı metinleri korunur.

## Do's and Don'ts

### Do:
- Yeni sayfayı güncel ortak kabuğa ekle; benzer mevcut sayfanın bileşenlerini kullan.
- Masaüstü ve mobil kapsamını ayrı uygula; tek görünüm istendiyse diğerini koru.
- İşlevleri, yetkileri, hesaplamaları ve gerçek kayıt sonucunu koru.
- Minimum 44 × 44 px dokunma alanı, görünür odak, uzun içerik ve boş/hata/yükleme durumlarını kontrol et.
- Görsel doğrulama yapılamadıysa bunu açıkça bildir.

### Don't:
- Baskın mavi tema, büyük tekrar başlık kartı veya eski yatay modül menüsü oluşturma.
- İçeriği sığdırmak için mobil yazıları ve dokunma alanlarını küçültme.
- Kaydedildi/gönderildi sonucunu doğrulanmamış veriden üretme; örnek sayaç veya yeni işlev uydurma.
- Tip/CSS kontrolü geçti diye görünüm ve etkileşimlerin tarayıcıda doğrulandığını söyleme.
