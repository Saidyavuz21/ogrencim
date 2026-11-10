# tofutr — yeni sayfalar için arayüz kuralları

Güncelleme: 9 Kasım 2026. Codex, Claude, Gemini ve diğer kodlama ajanları yeni arayüz oluştururken veya mevcut ekranı değiştirirken bu kuralları uygular. Kullanıcının sonraki açık talebi önceliklidir.

## Önce okunacaklar

1. Kök `AGENTS.md`, `PRODUCT.md` ve `DESIGN.md`.
2. Değiştirilecek TSX/CSS ve aşağıdaki en yakın güncel örnek.
3. Next.js kodundan önce kurulu sürümün `node_modules/next/dist/docs/` içindeki ilgili rehberi.

`DESIGN.md` görsel sistemin kaynağıdır; bu dosya uygulama kurallarıdır. `docs/TASARIM_DILI.md` tarihsel öneridir, güncel kuralları geçersiz kılamaz. Tasarımı eski mockup veya eğitim verisinden değil güncel kaynak ve kullanıcının kabul ettiği kararlardan türet.

## Kapsam ve işlev güvenliği

- Masaüstü web ve mobil web aynı dili kullanır; yerleşim birebir küçültülmez. Ayrı native mobil uygulama yapılmış gibi konuşma.
- Yeni öğretmen sayfası ortak temayla yapılır. Öğrenci/yönetici ekranına öğretmen kabuğunu otomatik kopyalama; rolün mevcut gezinmesini koru.
- Kullanıcı tek görünüm istediyse diğer kırılımları değiştirme.
- Görsel çalışmada API/Supabase sorguları, RLS/roller, silme onayları, dosya sınırları, PIN gizliliği, puan/not hesapları ve kayıt işlemleri korunur.
- Tahta editörü, tam ekran/sunum ve sayaç davranışlarına genel sayfa stilleriyle müdahale etme. İşlevi olmayan silgi boyutu gibi yanıltıcı ayarlar ekleme.
- Örnek öğrenci, bildirim, sayaç ve grafik verisi uydurma; veri yoksa gerçek boş durumu göster.

## Ortak kabuk

- Öğretmen sayfasını `TeacherDashboard.tsx` üzerinden bağla; sayfa kaydı ve menü başlığı `teacherPages.ts` içindedir. `visibleTeacherPages` ile rol sınırını koru.
- Header, sidebar, alt menü ve ortak sınıf state'ini tekrar oluşturma.
- Masaüstü `TeacherTopBar`: marka/sınıf solda, mesaj/bildirim/profil sağda. Dış yüzey geniş kalır; öğeleri ortada dar bir kümeye toplama.
- `TeacherSidebar`: açıkken ikon + yazı; daraltılmışken ikon ve hover/klavye odağında tooltip. Tooltip kaydırılan panelin içinde kesilmez.
- Mobil üst menü açma ikonu logonun yanındadır. Alt menü **Ana sayfa / Sınıf araçları / Mesajlar / Profilim**. Araç menüsü seçici, kronometre, gruplama ve geri sayımı açar. Yeni "Dersler" sekmesi icat etme.
- Masaüstünde üst menüden erişilen mesaj/duyuru/profili sidebar'da tekrarlama; mobil çekmecenin mevcut bağlantılarını koru.
- Ortak sınıf, liste filtresi ve ödev formunun çoklu hedef sınıfları farklı kapsamlardır; bunları tekli seçime indirgeme.
- Alt sayfa başlığı `TeacherPageHeader` ile küçük çerçevesiz H1 olur. Yeni sayfa kimliğini kompakt başlık düzenine ekle veya aynı işi ortak bileşenle sağla. Büyük başlık kutusu ve gereksiz geri bağlantısı ekleme.

## Ölçü ve yüzey

- Profilim/Hesabım masaüstü yerleşimi `TeacherProfile.module.css` kapsamındadır ve ortak kabuğun içerik genişliğine uyar; içeriye ayrı dar bir maksimum genişlik koyma. Fotoğraf ve bölüm menüsü soldaki kalıcı panelde, seçilen Hesap bilgileri / Topluluk profili / Güvenlik içeriği sağda kalır. Fotoğraf yükleme/kaldırma kontrolleri tektir; bölümler arasında kaybolmaz ve tekrar oluşturulmaz. Mobil düzeni bu masaüstü kurallarıyla değiştirme.

- `DESIGN.md` renkleri ve mevcut `--teacher-*` değişkenleri kullanılır. Sayfa sıcak kırık beyaz, yüzey beyaz, vurgu yeşildir. Baskın mavi tema yok.
- Panel: 1 px `--teacher-border`; masaüstü radius 18 px / padding 22–24 px, mobil radius 16 px / padding 16–18 px.
- Panel arası masaüstü 20–24 px / mobil 16–18 px; yakın kontroller arası 8–12 px.
- Satır ayırıcıları 1 px `#eeece5`; iç içe kartlar yerine okunaklı listeler kullan.
- Düğme radius 10–12 px; minimum dokunma alanı 44 × 44 px. Ana gönder/kaydet düğmesi çoğunlukla 48–50 px yüksekliğindedir. Mobil input fontu 16 px.
- H1 masaüstü 22 px / mobil 20 px ve 600; panel başlığı 18–20 px; öğrenci adı 14–16 px ve 500; yardımcı metin 12–14 px.
- Uzun öğrenci/dosya/sınıf adı satıra yayılır. `min-width: 0`, uygun kolonlar ve `overflow-wrap` kullan; adı düğme uğruna okunamaz biçimde kesme.

## Form ve seçimler

- Tekli seçimde `CustomSelect` kullan; native `<select>` veya yeni bir popup sistemi ekleme.
- Çoklu hedef seçiminde checkbox; Ödev gönder başlığının yanındaki menüyü örnek al.
- Görünür label/id bağlantısı, uygun placeholder ve disabled/boş durum gerekir.
- Tür seçenekleri eşit hizalanır, yalnızca biri etkin görünür. Mobil Ödev/Quiz/Tahta tek satırdaki üç eşit düğmedir; açıklama seçili türün altındadır.
- "Yeni tur" gibi kısa etiketler ikonuyla tek satırda kalır: `white-space: nowrap` ve gerektiğinde `flex-shrink: 0`.
- `Notice`, `Spinner`, `useDialog`, `Modal`, `CollapsiblePanel`, `ClassLevelSelects` gibi mevcut bileşenleri yeniden kullan.
- Filtre varsa temizleme ve sonuç bulunamadı durumu sun. Kaydet/gönder loading/disabled durumunu gerçek isteğe bağla; başarıyı işlem tamamlanmadan gösterme.

## Mobil ve erişilebilirlik

- Süper admin sayfaları `AdminDashboard` kabuğunu ve `AdminManagement.module.css` yönetim desenlerini kullanır. Mobilde tek ikonlu işlem kimliğin sağında, birden çok işlem kimliğin altında kalır. Sayfalama ve seçim kontrolleri en az 44 px olmalıdır; okul–sınıf–öğrenci gezinmesi ve PIN gizleme davranışı korunur.

- Öğrenci panelinin kendi alt menüsü **Ana sayfa / Ödevler / Mesajlar / Hesabım** olarak kalır. Öğretmen araç menüsü öğrenciye taşınmaz. Öğrenci sunum değişiklikleri `StudentPortal.module.css` içindeki `.portal` kapsamındadır; ortak rol bileşenlerini genel seçicilerle yeniden biçimlendirme.

- Ortak kabuk kırılımı 1024 px; içerikte mevcut 640/767/768 eşiklerini bağlama göre kullan.
- Mobilde ana liste tek sütun; işlem gerektiğinde ikon olur, `aria-label` ve minimum 44 × 44 px alan korunur. `title` tek başına erişilebilir ad değildir.
- Öğrenciler örneği: sınıf / No–A-Z / PIN göz ikonu aynı satır; öğrenci adı ve düzenle kalemi aynı satır. Çok dar alanda küçültmek yerine yerleşimi uyarla.
- Ana sayfadaki yeşil okul/öğretmen/sınıf bilgi panelini koru. Bunu diğer sayfalara dekoratif büyük hero olarak taşıma.
- Alt menü ve `env(safe-area-inset-bottom, 0px)` için içerik boşluğu ayır. Sabit kaydet/toplu işlem çubuğu alt menüyü örtmez.
- Sohbet/tahta/sunum gibi bilinçli tam ekran modlarının geri dönüş ve gizleme davranışını koru.
- Mobil veri tabloları okunaklı özet satırlarına dönüşebilir veya etiketli, klavyeyle odaklanabilen yatay kaydırma alanı kullanır; veriyi gizleyerek sığdırma.
- `aria-current`, `aria-pressed`, `aria-expanded` gerçek durumla eşleşir. Tab/radyo/checkbox semantiği, görünür odak ve klavye erişimi gerekir.
- Uzun metin, 200% yakınlaştırma, `prefers-reduced-motion`, boş/hata/yükleme durumlarını dikkate al.

## Kaynak örnekler

- Ortak kabuk: `src/components/teacher/TeacherDashboard.tsx`, `TeacherTopBar.tsx`, `TeacherSidebar.tsx`, `TeacherMobileNav.tsx`, `TeacherPageHeader.tsx`.
- Renk/ölçü ve sayfa desenleri: `src/components/teacher/TeacherDashboard.module.css`.
- Kompakt liste/işlemler: `TeacherStudentsPage.tsx`, `TeacherPointsPage.tsx`.
- Form + liste: `TeacherAssignmentsPage.tsx`; not girişi: `TeacherGradesPage.tsx`.
- Ana sayfa ve araç ayırıcıları: `TeacherHome.tsx`.
- Etiketli filtreler: `src/components/quiz/QuestionBankPage.tsx`, `src/components/files/TeacherFilesPage.tsx`.
- Bağımsız liste stilleri: `src/components/board/TeacherBoards.module.css`; editörün `Board.module.css` stilini kullanarak tüm editörü değiştirme.
- Mobil rapor özeti ve print ayrımı: `src/components/reports/ClassReportPage.tsx`, `Reports.module.css`.

Bu kaynaklar mevcut örnektir, kusursuzluk garantisi değildir. Eski CSS'in üstüne yığılmış override'ları kopyalama. Yeni stilleri tek sayfa scope'unda veya ayrı CSS Module'de topla; ortak bileşeni tüm rollerde yanlışlıkla değiştirme.

## Tamamlama kontrolü

1. Kullanıcının görünüm kapsamını ve mevcut işlemleri belirle; ilgili kaynakları oku.
2. Ortak kabuk ve mevcut bileşenlerle uygula; API/yetki/hesaplama davranışını koru.
3. Uygun TypeScript/CSS ve ilgili mevcut kontrolleri çalıştır; bağımsız hataları açıkça raporla.
4. Mümkünse 1440 px masaüstü ve 360/390/430 px mobilde gerçek renderı incele: uzun adlar, taşma, popup kesilmesi, seçili durum, alt menü/kaydet çakışması ve temel işlemler.
5. Gerçekte geçen kontrolleri ve görsel doğrulama sınırını söyle. Tip/CSS kontrolü görsel test değildir.

Bu belgeler ajanlara talimat verir; otomatik yaptırım veya görsel test oluşturmaz. Kalıcı bir tasarım kararı değişirse bu rehber ve `DESIGN.md` de güncellenir.
