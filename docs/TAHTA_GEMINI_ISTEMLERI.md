# Tahta – Gemini istemleri (özellik paketi 8)

Karar (13 Kasım 2026): Kodun tamamını Gemini yazar. Claude yalnızca bu istemleri yazar ve her istemden sonra kısa kontrol yapar.

**Kullanım:**
1. Gemini'ye önce "Ortak kurallar"ı, hemen altına sıradaki istemi yapıştır.
2. Gemini bitirince raporunu Claude'a yapıştır. Claude `tsc`/`eslint` çalıştırır, farka bakar, commit eder ve yayınlar.
3. Düzeltme gerekirse Claude kısa bir düzeltme istemi yazar.

İstemler kolaydan zora sıralıdır. Bir istem bitmeden sonrakine geçme.

---

## Ortak kurallar (her istemin başına yapıştır)

```
Proje: tofutr.com okul portalı (Next.js + Supabase, TypeScript, CSS Modules). Çalışma klasörü: F:\Web Site\ogrenci

ÖNCE OKU: AGENTS.md, DESIGN.md, docs/UI_KURALLARI.md. Sonra tahta kodu:
src/lib/boardData.ts (BoardEl, WidgetKind, WidgetData, BoardContent tipleri ve normalize/doğrulama fonksiyonları),
src/components/board/BoardEditor.tsx (araçlar, durum, geri al), BoardCanvas.tsx (çizim, seçim, işaretçi olayları),
Widgets.tsx (etkinlik parçaları), BoardEditorPanels.tsx (ekleme panelleri), StudentBoardPlayer.tsx (öğrenci görünümü).
Next.js kodu yazmadan önce node_modules/next/dist/docs/ içindeki ilgili rehbere bak.

ÖRNEK AL:
- Yeni etkinlik parçası (widget) nasıl eklenir: git show 0a717d3 (Video parçası). Aynı yolu izle:
  boardData.ts'de WidgetKind + WidgetData alanı + normalize/doğrulama, Widgets.tsx'te çizim, BoardEditorPanels.tsx'te ekleme
  paneli, icons.tsx'te ikon.
- Yeni çizim aracı nasıl eklenir: git show 6a81b8e (Doldur aracı). Hesap ayrı bir dosyada, BoardEditor/BoardCanvas'a ince bağlantı.

KESİN KURALLAR
1. Veritabanına, supabase/ klasörüne ve SQL'e DOKUNMA. Tahta içeriği zaten BoardContent JSON'u olarak kaydediliyor;
   yeni veri bu JSON'a yeni alan/tür olarak girer. Kaydetme/yükleme fonksiyonlarını değiştirme.
2. Eski tahtalar bozulmamalı: yeni alanlar isteğe bağlı (optional) olsun, normalize fonksiyonu bilinmeyen/eksik değeri
   güvenli varsayılana çevirsin. Var olan tür ve alanların adını değiştirme.
3. Öğrenci görünümü (StudentBoardPlayer) ve sunum kipi: yeni parça orada da çalışmalı; öğrenci yalnızca etkileşir,
   öğretmenin içeriğini kalıcı olarak değiştiremez.
4. Tasarım: DESIGN.md + docs/UI_KURALLARI.md. Mevcut tahta stillerini (Board.module.css) ve araç çubuğu düzenini izle.
   Dokunma alanı en az 44×44 px. İkonlar yalnızca src/components/icons.tsx (aynı çizgi tarzında ekle; emoji YOK).
   Tekli seçimde src/components/CustomSelect.tsx (native <select> YOK). Yeni stil yalnızca yeni ya da ilgili board CSS Module'ünde.
5. Dokunmatik + fare + kalem (pointer events) birlikte çalışmalı; etkileşimli tahtada parmakla kullanılabilmeli.
6. Geri al / yinele: tahtaya kalıcı etki eden her işlem mevcut geri alma yığınına girmeli.
7. Erişilebilirlik: ikon düğmelerde aria-label, aria-pressed gerçek durumla eşleşsin, görünür odak.
8. Metinler Türkçe ve kısa. Dış servise istek yok (yeni CDN, analitik, iframe ekleme). Yeni npm paketi gerekiyorsa
   önce gerekçesini yaz, tam sürüm numarasıyla ekle.
9. Bitince çalıştır: npx tsc --noEmit -p .  ve  npx eslint <değiştirdiğin dosyalar>. Hataları düzelt.
   git commit / push YAPMA. Rapor: değiştirilen/eklenen dosyalar, yapılamayanlar, varsa "EKSİK:" notları.
   Tarayıcıda denemediysen "görsel kontrol yapılmadı" yaz. Raporu kısa tut.
```

---

## İstem 1 – Çark ve zar (etkinlik parçası)

```
GÖREV: İki yeni etkinlik parçası: "Çark" (kind: 'spinner') ve "Zar" (kind: 'dice').

Çark: öğretmen 2–12 dilim yazar (kısa metin, her dilim farklı renk; renkler palete uygun). "Çevir" düğmesi çarkı
yaklaşık 3 saniye yavaşlayarak döndürür, rastgele dilimde durur, sonucu çarkın altında büyük yazar.
"Çıkanı kaldır" seçeneği: işaretliyse çıkan dilim o oturum için gizlenir (kalıcı değil), "Sıfırla" geri getirir.
Zar: 1–3 zar, "At" düğmesi kısa animasyonla rastgele yüzler gösterir; toplam yazılır.
İkisi de sunum kipinde ve öğrenci görünümünde çalışır. prefers-reduced-motion açıksa animasyon kısalır.
Rastgelelik için crypto.getRandomValues kullan.
```

## İstem 2 – Lazer işaretçi, ekran perdesi, spot ışığı (sunum araçları)

```
GÖREV: Sunum kipinde üç geçici araç. Hiçbiri tahtaya kaydedilmez, geri alma yığınına girmez.

1. Lazer: işaretçinin arkasında 1 saniyede sönen kırmızı iz. Kalem/parmakla da çalışır.
2. Perde: tahtanın üstünü kapatan opak örtü; alt kenarından tutulup aşağı çekilerek içerik satır satır açılır.
3. Spot ışığı: ekran kararır, sürüklenebilir yuvarlak bir alan açık kalır; köşeden boyutu değiştirilir.
Sunum kipindeki mevcut kalem menüsünün (commit 871d765) yanına yerleştir. Esc ile aracı kapat.
```

## İstem 3 – Öğe kilitleme ve yakınlaştırma

```
GÖREV:
A) Kilit: seçili öğe(ler) için "Kilitle / Kilidi aç". Kilitli öğe seçilemez, taşınamaz, silinmez, silgiden etkilenmez;
   arka plan gibi davranır. Öğeye isteğe bağlı locked?: boolean alanı ekle. Kilitli öğeleri açmak için sayfa menüsünde
   "Tüm kilitleri aç". Geri alınabilir olsun.
B) Yakınlaştırma: düzenleyici ve sunum kipinde %50–%300 arası. Ctrl+tekerlek, iki parmak sıkıştırma, araç çubuğunda
   − / % / + ve "Sığdır". Yakınken boş alanda iki parmakla (ya da boşluk tuşu + sürükle) kaydırma.
   Koordinat dönüşümünü tek yerde topla; çizim, seçim, Doldur aracı ve etkinlik parçaları yakınken doğru noktaya düşmeli.
   Yakınlaştırma kaydedilmez.
```

## İstem 4 – Hizalama kılavuzları ve sunumda Doldur

```
GÖREV:
A) Hizalama: öğe sürüklenirken diğer öğelerin kenar ve merkezlerine 6 px içinde yaklaşınca yapışır, ince kılavuz çizgisi
   görünür. Sayfa merkezine de yapışır. Alt tuşu basılıyken yapışma kapalı. Çoklu seçimde "Sola / ortaya / sağa hizala",
   "Üste / ortaya / alta hizala", "Eşit aralıkla dağıt" düğmeleri.
B) Sunum kipinde Doldur: sunum kalem menüsüne Doldur aracını ekle (bucketFill.ts'i yeniden kullan). Sunumda yapılan dolgu
   sunum kalemi çizimleriyle aynı geçici katmanda tutulur; tahtanın kayıtlı içeriğini değiştirmez.
```

## İstem 5 – Sıralama ve gruplara ayırma (etkinlik parçası)

```
GÖREV: İki yeni etkinlik parçası. Örnek olarak mevcut 'match' (eşleştirme) parçasının yapısını izle.

1. Sıralama (kind: 'order'): öğretmen 3–8 maddeyi doğru sırada yazar. Öğrenciye karışık gelir; sürükleyerek
   (ya da her maddedeki yukarı/aşağı düğmeleriyle) sıralar. "Kontrol et": doğru yerdekiler yeşil, yanlışlar kırmızı çerçeve,
   "x/8 doğru". "Yeniden karıştır".
2. Gruplara ayırma (kind: 'sort'): 2–4 grup başlığı, her gruba ait maddeler. Öğrenciye maddeler karışık bir havuzda gelir;
   sürükleyip ya da madde seçip grup başlığına dokunarak yerleştirir. "Kontrol et" doğru/yanlışı gösterir.
Klavye ile de kullanılabilmeli. Cevap öğrencinin tarayıcısında kalır, kaydedilmez.
```

## İstem 6 – Boşluk doldurma ve görsel etiketleme (etkinlik parçası)

```
GÖREV:
1. Boşluk doldurma (kind: 'blanks'): öğretmen metni yazar, boşluk olacak kelimeleri [köşeli parantez] içine alır.
   Öğrenci kelime havuzundan sürükler ya da boşluğa dokunup kelime seçer. "Kontrol et". Büyük/küçük harf ve Türkçe karakter
   karşılaştırması tr-TR ile yapılsın. İsteğe bağlı: havuza 0–3 çeldirici kelime.
2. Görsel etiketleme (kind: 'label'): öğretmen tahtadaki bir görseli seçer (ImageEl, mevcut yükleme yolunu kullan; yeni
   depolama kodu YAZMA), görsel üstüne numaralı noktalar koyar ve her noktaya doğru etiketi yazar. Öğrenci etiketleri
   noktalara sürükler. "Kontrol et".
```

## İstem 7 – Kesir boyama etkinliği

```
GÖREV: Etkinlik parçası (kind: 'fraction'). Öğretmen şekil (daire / dikdörtgen şerit / kare ızgara) ve parça sayısını
(2–12) seçer, hedef kesri yazar (ör. 3/4). Öğrenci parçalara dokunarak boyar/siler. "Kontrol et": boyalı parça sayısı
hedefle eşdeğerse doğru (ör. 6/8 = 3/4 kabul; sadeleştirme hesapla). Altta "Boyadığın: 6/8" yazar.
İsteğe bağlı: "Kesri göster" kapalıysa öğrenci hedefi resimden okur (öğretmen hedefi başlıkta yazar).
```

## İstem 8 – Cetvel, gönye, iletki, pergel

```
GÖREV: Düzenleyicide ve sunumda kullanılan ölçme araçları. Ayrı dosya: src/components/board/measureTools.tsx (+ CSS Module).

- Cetvel: sürüklenebilir, iki parmakla/köşe tutamacıyla döndürülebilir; cm ve mm çizgileri (ekranda 1 cm = 37.8 px,
  yakınlaştırmayla ölçeklenir). Kalemle cetvel kenarı boyunca çizilen çizgi kenara yapışıp düz olur. Açı göstergesi.
- Gönye: 45° ve 30-60° iki tür; kenarlarına yapışma cetvelle aynı.
- İletki: 180° yarım daire, 1° çizgiler, iki kolu sürüklenerek açı ölçülür, açı değeri yazılır.
- Pergel: merkez noktası ve yarıçap tutamacı; çevirme tutamacıyla yay/çember çizer. Çizilen yay normal kalem çizgisi
  (StrokeEl) olarak eklenir, geri alınabilir.
Araçlar tahtaya öğe olarak kaydedilmez; yalnızca çizdikleri çizgiler kalır. Aynı anda birden fazla araç açık olabilir.
```

## İstem 9 – Akıllı kalem (şekil tanıma)

```
GÖREV: Kalem menüsüne "Akıllı kalem" seçeneği. Çizim bitince çizgi şuna benziyorsa düzgün şekle çevrilir:
düz çizgi, ok (uçta V), üçgen, dikdörtgen/kare, daire/elips. Benzemiyorsa çizgi olduğu gibi kalır.
Tanıma ayrı dosyada (src/components/board/shapeRecognition.ts), saf fonksiyon; dış kütüphane yok.
Çevrilen şekil mevcut ShapeEl / PolyEl türleriyle oluşturulur (yeni tür ekleme). Tek geri al adımı çizgiyi geri getirir.
Yanlış tanımayı azaltmak için eşikleri ihtiyatlı tut; kısa karalamaları şekle çevirme.
```

## İstem 10 – Fonksiyon grafiği (etkinlik parçası)

```
GÖREV: Etkinlik parçası (kind: 'graph'). Öğretmen bir ya da iki ifade yazar (ör. 2x+1, x^2-3, sin(x)), eksen aralıklarını
seçer. Parça koordinat düzlemini ızgarayla çizer ve fonksiyonları farklı renklerde gösterir.
İfade ayrıştırıcıyı kendin yaz (src/lib/mathExpr.ts): + − * / ^, parantez, sin cos tan sqrt abs log ln, pi, e, örtük çarpma
(2x). eval / new Function YASAK. Hatalı ifadede kırmızı kısa uyarı. Tanımsız noktalarda çizgi kopar.
Öğrenci görünümünde grafik üstünde dokunulan noktanın (x, y) değeri gösterilir.
```

## İstem 11 – PDF'ten sayfa aktarma

```
GÖREV: "PDF'ten sayfa ekle": öğretmen PDF seçer, sayfalar küçük resimlerle listelenir, istediklerini işaretler.
Her seçili sayfa yeni tahta sayfası olur; PDF sayfası resme çevrilip (genişlik en fazla 1600 px, JPEG kalite 0.85)
o sayfaya arka plan resmi gibi (ImageEl, kilitli) yerleştirilir.

- PDF okuma için pdfjs-dist (tam sürümle ekle); worker dosyası yerelden servis edilsin, CDN yok.
- Resim yükleme mevcut tahta resim yükleme fonksiyonuyla yapılır (yeni depolama kodu YAZMA). Her sayfa öğretmenin kotasından
  düşer; yüklemeden önce toplam boyutu tahmin edip "Yaklaşık 8 MB yer kaplayacak" diye göster. Kota yetmezse mevcut kota
  hatasını kullanıcıya göster, yarım kalan sayfaları ekleme.
- En fazla 30 sayfa; büyük PDF'te uyarı. İlerleme çubuğu ve İptal düğmesi.
- Şifreli/bozuk PDF'te anlaşılır hata.
İstem 3'teki kilit (locked) alanı bu işe bağlıdır; o yapılmış olmalı.
```
