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

- Masaüstü kabuğu 1024 px ve üstüdür. Sidebar grid kolonları açıkken 264 px, daraltıldığında 104 px; bunlar dış boşluğu da içerir.
- Header geniş tek beyaz yüzeydir. Logo/sınıf solda; mesaj, bildirim ve profil sağda. Öğeleri 1200 px ortalanmış dar kümeye sıkıştırma. Geniş ekranda 48 px, 1024–1199 px arasında 32 px yatay iç boşluk vardır.
- İçerik header'dan bağımsızdır. Genel `.dashboard` 1152 px; yenilenen çalışma alanları en fazla 1560 px kullanır. Benzer sayfanın kapsamlı seçicilerini izle; bütün sayfaları yanlışlıkla yeniden boyutlandırma.
- Panel içi masaüstünde 22–24 px, mobilde 16–18 px; panel arası masaüstünde 20–24 px, mobilde 16–18 px.
- 1024 px altında üstte logo yanında menü ikonu, yandan çekmece, altta **Ana sayfa / Sınıf araçları / Mesajlar / Profilim** bulunur. Sınıf araçları dört aracı açan menüdür.
- Sayfaya özel içerik kırılımlarında mevcut 640/767/768 px eşikleri izlenir. Mobil alt menü ve güvenli alan için boşluk ayrılır; kaydet/toplu işlem çubukları alt menüyü örtmez.
- Alt sayfalarda küçük, çerçevesiz H1; büyük ikonlu başlık kartı ve gereksiz Ana sayfa geri bağlantısı yok. Gerekli mobil sınıf seçimini koru. Ödev gönder başlığı altında ikinci sınıf seçici yok; formun hedef sınıf seçimi ayrıdır.
- Mobil ana sayfadaki yeşil okul/öğretmen/sınıf paneli kullanıcının özellikle koruduğu istisnadır.

Giriş/kayıt istisnası: tek sütun, en fazla 520 px içerik; mobilde 20 px, 540 px üstünde 32 px panel dolgusu. Alanlar ve ana düğme 52 px; PIN kutuları 52 × 56 px. Bu genişlik öğretmen dashboard'una taşınmaz.

## Elevation & Depth

İçerik panelleri ince kenarlıkla ayrılır; ağır gölge kullanılmaz. Header ve popup'ta mevcut hafif gölgeler kullanılabilir: header `0 3px 12px rgb(32 53 45 / 4%)`, popup `0 8px 24px rgb(20 35 28 / 12%)`. Dekoratif cam/blur veya parlama ekleme.

## Shapes

Kontroller 8–12 px, ana paneller masaüstünde 18 px / mobilde 16 px köşelidir. Yuvarlak avatar ve küçük pastel araç ikonları mevcut sistemin parçasıdır. Giriş ekranına ait şekil kısıtları bütün öğretmen paneline genellenmez.

## Components

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
