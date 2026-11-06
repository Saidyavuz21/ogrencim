---
name: e-Okul — Sınıf Atölyesi
description: Telefon öncelikli, sıcak ve okunaklı giriş, kayıt ve öğretmen paneli.
colors:
  background: "#f7f6f2"
  surface: "#ffffff"
  text: "#20352d"
  muted: "#58665f"
  border: "#dedad0"
  control-border: "#a4b1a6"
  primary: "#25634b"
  primary-hover: "#1d503d"
  selected: "#e6f1e9"
typography:
  body:
    fontFamily: "var(--font-geist-sans), Arial, sans-serif"
    fontSize: "16px"
    lineHeight: 1.65
  headline:
    fontSize: "clamp(28px, 5vw, 34px)"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-.03em"
  label:
    fontSize: "14px"
    fontWeight: 600
rounded:
  control: "10px"
  panel: "16px"
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
    padding: "14px 16px"
---

# Design System: e-Okul

## Overview

**Creative North Star: "Sınıf Atölyesi"**

Sınıf Atölyesi: sıcak, destekleyici ve düzenli bir okul portalı. Ana kullanım ortamı telefondur. İçerik tek ekrana sığdırılmak için sıkıştırılmaz.

Uygulama kapsamı: src/components/auth/AuthPage.tsx ve AuthPage.module.css. Öğretmen panelinin ortak görünümü ve Ödev Kontrolü ekranı da aynı sisteme geçirildi; diğer roller henüz uyarlanmadı. Bu belge kaynak koddan çıkarılmıştır; tarayıcı doğrulaması computer-use URL güven eşiği nedeniyle engellendi. Hesaplanan stiller, taşma, büyük metin ve klavye davranışları görsel olarak doğrulanmadı. Görsel onay verilmedi.

**Key Characteristics:**
- Sıcak yüzeyler
- Derin yeşil ana eylem
- Tek sütunlu mobil formlar

## Colors

Sıcak kırık beyaz sayfa, beyaz çalışma yüzeyi, derin yeşil ana eylem. Ana eylem rengi bütün giriş rollerinde aynıdır. Seçim açık yeşil yüzey, kenarlık ve onay simgesiyle belirtilir. Hata ve başarı renkleri metin ve simgeyle desteklenir; yalnızca renkle anlam verilmez.

### Primary

Derin yeşil ana düğme, seçili kontrol, odak ve imleçte; açık yeşil seçili rol ve şifre düğmesinin hover yüzeyinde kullanılır.

### Neutral

Sıcak kırık beyaz sayfayı, beyaz paneli taşır. Panel sınırı ile alan sınırı ayrı tonlardadır.

## Typography

Mevcut Geist Sans CSS değişkeni kullanılır; Arial ve sans-serif yedektir. Ana başlık 28–34 px, marka 18 px, alan metni 16 px, etiket 14 px, açıklama 13 px. Frontmatter içindeki body satır yüksekliği giriş açıklamasından gelir; bütün alanlara uygulanmış genel bir satır yüksekliği değildir. Font aile ve ölçülerin hesaplanan değerleri tarayıcıda doğrulanmalıdır.

## Layout

Öğretmen paneli: src/components/teacher/TeacherDashboard.module.css ve TeacherDashboard.tsx. Ana gruplar arasında 24 px; başlık panelinde 20–24 px iç boşluk; mobilde modül seçimi etiketli select, 768 px ve üzerinde satıra yayılan modül düğmeleri. PortalApp yalnızca öğretmen rolünde ortak kabuk temasını uygular. Öğrenci kontrol satırı mobilde tek sütun, geniş ekranda iki sütundur. Durum etiketleri 48 px, diğer düğmeler en az 44 × 44 px. 379 px altında puan ve katılım alanları da alt alta gelir.


Telefon önce gelir: tek sütun; sayfa kenarı 16 px; panel içi 20 px; form grupları arasında 24 px; alanlar arasında 20 px. İçerik en fazla 520 px genişliğindedir. 540 px üzerinde panel içi 32 px olur, yalnızca il ve ilçe yan yana gelir. PIN alanları dört adet 52 × 56 px kutudur. Form alanları 52 px, ana düğmeler en az 52 px; mod değiştirme düğmeleri en az 48 px ve şifre simge düğmeleri 48 px yüksekliğindedir. Uzun kayıt formu doğal dikey kaydırmayla kullanılır. Alt güvenli alan dikkate alınır.

**The Telefon Önce Rule.** Mobil alanlar tek sütunda kalır; yalnızca il ve ilçe geniş ekranda eşleşir.

## Elevation & Depth

Ana panel ince kenarlıkla ayrılır. Dekoratif gölge kullanılmaz. Rol seçimi yüzey tonu ve açık seçim göstergesiyle ifade edilir.

## Shapes

Kontroller yumuşak köşeli; ana panel daha geniş köşelidir. Daire yalnızca rol seçim göstergesinde kullanılır.

## Components

- Öğretmen başlığı: kimlik, sınıf seçici, yeni sınıf; gerçek kaynak dizilerinden özet sayılar.
- Öğretmen modülleri: mobil select ve masaüstü nav; aynı dokuz hedef, etkin modülde aria-current.
- Öğrenci ödev satırı: isim, numara, aynı gruba ait üç radio durum seçimi, etiketli puan ve kontrol notu; artı/eksi ve ayrıntı düğmeleri erişilebilir ad taşır.
- Ödev yok: kontrol alanı yerine ödev oluşturma yönlendirmesi. Filtre sonucu boş: filtreleri temizleme eylemi.
- Öğretmen bildirimi: role=status, üstte 80 px, kenarda 16 px, en çok 480 px genişlik. Beyaz metin/yeşil zemin.

Öğretmen paneli doğrulaması: örnek öğrenciyle dolu render ve boş ödev render kontrolü geçti; açık önizleme HTTP 200 ve yeni modül/öğrenci kontrol kodunu sunuyor. Mobil görsel onayı verilmedi. Proje genelindeki mevcut tip/lint hataları bu tasarım çalışmasında giderilmedi.


- Rol seçimi: üç tam genişlikte düğme; ikon, başlık, açıklama ve seçim göstergesi. aria-pressed seçimi bildirir.
- Giriş/kayıt değişimi: iki düğme, etkin durum ve görünür klavye odağı. İstek sırasında devre dışı.
- AuthField: htmlFor/id bağlantılı etiket; varsa kimlikli yardım metni. Form alanları 16 px; şifre yöneticisi için autocomplete tanımlıdır.
- Şifre: mevcut giriş ve kayıt şifreleri göster/gizle düğmesiyle okunabilir. Durum erişilebilir ad ve aria-pressed ile bildirilir.
- PIN: sayısal telefon klavyesi, dört gizli hane, ileri/geri odak ve yapıştırma desteği.
- Kayıt: Hesap bilgileri ve Okul bilgileri grupları. Yönetim onayı gerekliliği formun başında görünür.
- Bildirim: hata role=alert, başarı role=status. İstek sırasında alanlar ve mod seçimi kilitlenir, gönderim metni değişir.
- Odak: 3 px yeşil dış çizgi, 3 px ofset. Hover geçişleri 150 ms; azaltılmış hareket tercihinde kaldırılır.

## Do's and Don'ts

- Do: mobilde okunaklı metin ve yeterli dokunma alanı kullan.
- Do: aynı eylem için aynı renk ve etkileşim davranışını koru.
- Do: uzun okul/branş adları, 360–430 px genişlikler ve büyük metinle doğrula.
- Don't: daha fazla alanı yan yana sığdırmak için font küçültme.
- Don't: gerçek işlem sonucu doğrulanmadan kayıt veya teslim başarısı gösterme.
- Don't: giriş ekranının yenilenmesini diğer panellerin de yenilendiği şeklinde sunma.
