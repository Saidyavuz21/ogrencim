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

---

# Paket 9 – Veri ve sayı parçaları (13 Kasım 2026 eklendi)

Not: Yeni parçalarda dış kapsayıcı `className={`${bs.widget} ${styles.wrap}`}` olmalı (`bs` = `./Board.module.css`).
Aksi hâlde arkadaki yer tutucu başlık görünür ve iç boşluk kaybolur (Görsel Etiketleme ve Grafik'te bu hata düzeltildi).
Ölçüler px değil cqw (tahta genişliğine göre); örnek: ActivityWidgets.module.css.

## İstem 12 – Sütun grafiği

```
GÖREV: Etkinlik parçası (kind: 'bar'). Öğretmen başlık, 2–8 kategori (ad + değer), eksen adları ve ölçek adımını
(1, 2, 5, 10) girer. Kipler:
- "Göster": sütunlar hazır çizilir, değerler sütun üstünde yazar.
- "Öğrenci çizsin": sütunlar boş başlar; öğrenci sütunun tepesini sürükleyerek (ya da sütuna dokunup +/− ile) yükseltir,
  değer ölçek adımına yapışır. "Kontrol et" her sütunu doğru/yanlış gösterir.
- "Öğrenci okusun": sütunlar çizili, altta "En çok hangisi?", "X ile Y farkı kaç?" gibi öğretmenin yazdığı 1–3 soru ve
  cevap kutusu; "Kontrol et".
Yatay/dikey seçeneği. Renkler palete uygun, kategoriler farklı renk. SVG ile çiz.
```

## İstem 13 – Çetele tablosu

```
GÖREV: Etkinlik parçası (kind: 'tally'). Tablo: Kategori | Çetele | Sayı. Öğretmen 2–8 kategori ve her birinin sayısını
(0–30) girer. Çetele çizgileri 4 dik + 1 çapraz (5'li demet) olarak SVG ile çizilir. Kipler:
- "Göster": çetele ve sayı dolu.
- "Öğrenci çetele tutsun": öğrenci satırdaki "+" düğmesiyle çizgi ekler, "−" ile siler; Sayı sütununa sayıyı yazar.
  "Kontrol et" hem çeteleyi hem sayıyı denetler.
- "Öğrenci saysın": çetele dolu, Sayı sütunu boş; öğrenci yazar, "Kontrol et".
İsteğe bağlı: "Sütun grafiğine çevir" düğmesi aynı verilerle yanına 'bar' parçası ekler (öğretmen düzenleyicisinde).
```

## İstem 14 – Sayı tablosu (yüzlük tablo)

```
GÖREV: Etkinlik parçası (kind: 'numgrid'). 10 sütunlu sayı tablosu; öğretmen başlangıç ve bitişi seçer
(1–100 varsayılan; 0–99, 1–120, 101–200 gibi; en fazla 200 hücre).
- Öğretmen hücreleri gizleyebilir (tıklayarak) ya da "Rastgele N hücre gizle" der; gizli hücreye öğrenci sayıyı yazar,
  "Kontrol et".
- Boyama: öğrenci hücrelere dokunarak 3 renkten biriyle boyar (ör. 2'şer ritmik sayma, çift/tek, 5'in katları).
  Öğretmen isterse hedef kuralı seçer ("2'nin katlarını boya", "5'in katları", "10'un katları", "çift sayılar", "tek sayılar")
  ve "Kontrol et" eksik/fazla boyananları gösterir.
- "Temizle" düğmesi. Hücreler en az 44×44 px'e denk düşecek büyüklükte olmayabilir; bu parçada hücreye dokunmayı
  kolaylaştırmak için tablo parça boyutunu doldursun ve parça varsayılan boyutu büyük olsun.
```

## İstem 15 – Etkileşimli saat

```
GÖREV: Etkinlik parçası (kind: 'clock'). Analog saat: 1–12 rakamları, 60 dakika çizgisi (5'lerde kalın), akrep (kısa, kalın)
ve yelkovan (uzun, ince) farklı renkte; merkez noktası. SVG ile çiz. Şekil kitaplığındaki mevcut saat görünümünü örnek al.

Kollar iki yolla değiştirilir (ikisi birlikte çalışır, dokunmatik + fare + klavye):
1. Sürükleme: akrebi ya da yelkovanı tutup çevir. Yelkovan dakikaya (öğretmen seçimi: 1 ya da 5 dakikaya) yapışır.
   Bağlı hareket: yelkovan döndükçe akrep orantılı ilerler (12'yi geçince saat bir artar/azalır), gerçek saat gibi.
   Akrep sürüklenince yelkovan yerinde kalır, akrep saate yapışır ama dakikaya göre ara konumda durur.
2. Dokun-seç: önce akrebe ya da yelkovana dokun (seçili kol vurgulanır, aria-pressed), sonra bir rakama dokun.
   Yelkovan seçiliyse rakam × 5 dakikaya gider (3 → :15); akrep seçiliyse o saate gider. Rakamların dokunma alanı
   44×44 px'e yakın olsun.
Klavye: kol seçiliyken ok tuşları 1 adım çevirir.

Öğretmen ayarları ve kipler:
- "Serbest": öğrenci istediği gibi oynatır. İsteğe bağlı dijital gösterge (ör. 03:15) saatin altında açılıp kapanır.
- "Saati kur": öğretmen hedef saati yazar (ör. 3:30); öğrenci kolları ayarlar, "Kontrol et" doğru/yanlış gösterir
  (akrebin dakikaya göre ara konumu toleranslı kabul edilir).
- "Saat kaç?": öğretmen kolları ayarlar, öğrenci saati yazar (saat ve dakika iki kutu) ya da 4 seçenekten seçer; "Kontrol et".
- Başlangıç saati öğretmence ayarlanır; "Sıfırla" ona döner. Öğrencinin yaptığı kaydedilmez.
İsteğe bağlı: "Çeyrek / buçuk" gibi Türkçe okuma ("üçü çeyrek geçiyor", "üç buçuk") dijital göstergenin altında açılıp kapanır.
```

## İstem 16 – Ders kipinde "El" aracı

```
GÖREV: Ders (sunum) kipinin alt araç çubuğuna, kalemin soluna "El" aracı ekle (ikon: el; aria-label "El: çizmeden etkileşim";
aria-pressed gerçek durumla eşleşsin). Ders kipine girince varsayılan araç El olsun; kalem/silgi seçilince El kapanır.
El seçiliyken:
- Hiçbir çizim, silme, Doldur yapılmaz; tahtaya ve geri alma yığınına iz düşmez.
- Etkinlik parçaları (saat kolları, çark, sıralama, sayı tablosu, grafik vb.) dokunma/fare ile normal çalışır.
- Tahta yakınlaştırılmışsa boş alanda sürükleyerek kaydırılır (yakınlaştırma kodundaki kaydırmayı yeniden kullan).
- İmleç: boş alanda "grab", sürüklerken "grabbing".
Lazer, perde, spot ışığı açıkken El'in davranışı onlara üstünlük vermesin (onlar açıksa onlar çalışır).
Klavye kısayolu: H (El), P (kalem), E (silgi); yazı alanındayken kısayol çalışmasın.
Öğrenci görünümünde (StudentBoardPlayer) de aynı El aracı çizim araçlarının yanına eklensin.
```

## İstem 17 – Parçalar listesinde gruplar ve renkler

```
GÖREV: Düzenleyicideki "Parçalar" panelinde (ADDABLE_WIDGETS listesi) parçaları gruplara ayır; her grubun üstünde küçük
grup başlığı (h4 ya da görsel olarak küçük, büyük harf olmayan etiket) olsun. Renk yalnızca satırdaki ikon kutusunda;
satır zemini, kenarlığı ve yazısı bugünkü gibi sade kalsın. Sıra:
1. Soru ve etkinlik (yeşil): minitest, match, order, sort, blanks, label
2. Matematik (mavi): fraction, graph, bar, tally, numgrid, clock
3. Sınıf araçları (turuncu): steps, timer, spinner, dice
4. Medya (mor): audio, video
Grup ve renk bilgisi boardData.ts'te tek bir sabit (ör. WIDGET_GROUPS) olarak dursun; liste ondan üretilsin.
Renkler DESIGN.md paletine yakın, düşük doygunlukta açık zemin + koyu ikon olsun (ör. yeşil zemin #e6f0ea / ikon #25634b);
ikon ile zemin arasında en az 3:1 kontrast. Yeni bir parça grubu olmadan eklenirse "Diğer" grubunda görünsün.
```

## İstem 18 – Ölçme araçları düğmelerinin düzeni

```
GÖREV: Düzenleyicinin Çizim panelindeki "ÖLÇME ARAÇLARI" bölümünü düzenle (yeri değişmez, Çizim sekmesinde kalır).
1. Her araca kendi ikonu (src/components/icons.tsx, mevcut çizgi tarzında): Cetvel (cetvel), Gönye 45° ve Gönye 30-60°
   (dik üçgen; 30-60 olanı daha uzun), İletki (yarım daire + derece çizgileri), Pergel (iki bacaklı pergel).
2. Düğmeler eşit boyutlu, 2 sütunlu ızgara; ikon üstte ya da solda, etiket tek satır. Aralıklar paneldeki diğer
   düğme gruplarıyla aynı. En az 44×44 px dokunma alanı.
3. Açık olan araç aria-pressed="true" ve belirgin seçili görünüm (paneldeki diğer seçili araçlarla aynı stil); tekrar basınca kapanır.
4. Ders kipindeki ölçme araçları menüsü de aynı ikonları kullansın.
Davranışa (cetvele yapışma, pergel çizimi) dokunma.
```

## İstem 19 – Öğeler paneli: önce grup kartları

```
GÖREV: Düzenleyicinin "Öğeler" panelini (WIDGET_GROUPS / getWidgetGroups ile çizilen gruplu liste) iki adımlı yap.
1. İlk görünüm: her grup için bir kart (2 sütunlu ızgara; dar panelde 1 sütun). Kartta grubun rengiyle ikon kutusu,
   grup adı, "N öğe" ve ilk 3 öğenin adı ("Kesir Boyama, Fonksiyon Grafiği, Sütun Grafiği…"). Kart tamamen tıklanabilir
   <button>, en az 44 px yükseklik, görünür odak.
2. Karta basınca o grubun öğe listesi (bugünkü satırlar) açılır. Üstte "← Geri" düğmesi (aria-label "Gruplara dön")
   ve grup adı başlık olarak. Geri ve Esc tuşu kartlara döndürür.
3. Kartların üstünde arama kutusu ("Öğe ara"): yazılınca kartlar yerine tüm gruplardan eşleşen öğeler tek liste olarak
   çıkar (tr-TR büyük/küçük harf duyarsız; öğe adı ve grup adı). Sonuç yoksa kısa boş durum metni. Temizleyince kartlara döner.
4. Son açılan grup localStorage'da hatırlansın (try/catch ile; erişilemezse sessizce kartlarla başla); panel yeniden
   açılınca o grup açık gelir.
5. Öğe ekleme davranışı (addWidget, parça ortaya eklenir, ayarlar panelde açılır) değişmez. Panelin altındaki
   "Parça tahtanın ortasına eklenir…" açıklaması yalnızca öğe listesinde görünsün.
Renkler WIDGET_GROUPS'taki tonlardan gelir; yeni renk tanımlama.
```

---

# Paket 10 – Yeni parçalar (13 Kasım 2026)

Not: Yeni parçalarda dış kapsayıcı `${bs.widget} ${styles.wrap}` (bs = ./Board.module.css), ölçüler cqw.
Her yeni parça WIDGET_GROUPS'ta doğru gruba eklenir. Önerilen sıra: 20–22 bir parti, 23–25 bir parti, 26–27 ayrı.

## İstem 20 – Sayı doğrusu

```
GÖREV: Parça (kind: 'numberline', grup: Matematik). Öğretmen başlangıç, bitiş, büyük adım (çizgi + sayı) ve küçük adım
(yalnız çizgi) seçer; ondalık ve negatif desteklenir (ör. -10…10, 0…1 adım 0,1). Kesir etiketi seçeneği (0, 1/4, 2/4…).
Kullanım: noktaya dokununca işaret konur/kaldırılır (3 renk); "Atlama" kipinde iki noktaya sırayla dokununca aralarına
üstten yay ve yayın üstünde fark (+3, −2) çizilir. Öğretmen bazı sayı etiketlerini gizleyebilir; gizli etikete dokunan
öğrenci sayıyı yazar, "Kontrol et". "Temizle". SVG ile çiz.
```

## İstem 21 – Tahtada öğrenci seçici ve grup oluşturucu

```
GÖREV: İki parça (grup: Sınıf araçları): 'picker' (Rastgele öğrenci) ve 'groups' (Grup oluşturucu).
Öğretmen panelindeki "Sınıf araçları"nda bu ikisi zaten var (Rastgele seçici, Gruplama); onların veri alma ve seçme
mantığını bul ve ORTAK modüle taşıyarak yeniden kullan (kopyalama; mevcut sayfalar aynı modülü kullansın, davranışları bozulmasın).
- Parça ayarında sınıf seçimi (öğretmenin sınıfları, CustomSelect). Öğrenci adları tahta JSON'una KAYDEDİLMEZ;
  yalnızca sınıf adı/kimliği kaydedilir, adlar parça açılınca sunucudan okunur.
- picker: "Seç" düğmesi kısa animasyonla bir ad gösterir; "Seçilenleri tekrar seçme" (oturumluk), "Sıfırla".
- groups: 2–6 grup ya da "grup başına N kişi"; "Oluştur" grupları renkli kartlar olarak gösterir; "Karıştır".
- Öğrenci görünümünde (StudentBoardPlayer) bu iki parça ad göstermez: "Bu araç öğretmen ekranında çalışır." yazar.
Veritabanına dokunma; mevcut veri fonksiyonları yetmezse "EKSİK:" notu yaz.
```

## İstem 22 – Zemin: izometrik ve müzik dizeği

```
GÖREV: Sayfa zeminine iki seçenek ekle: 'isometric' (60° üçgen ızgara noktaları ya da ince çizgileri) ve 'staff'
(5 çizgili müzik dizeği, sayfa boyunca eşit aralıklı dizek grupları). Background tipine ekle, normalize eski değerleri korusun.
Zemin panelindeki küçük önizlemeler, renderBoardSvg (küçük resim/yazdırma) ve öğrenci görünümü de yeni zeminleri çizsin.
```

## İstem 23 – Kelime ve harf kartları

```
GÖREV: Parça (kind: 'wordcards', grup: Soru ve etkinlik). Örnek: mevcut 'order' (Sıralama) parçası.
İki kip: "Harflerden kelime" (öğretmen kelime yazar, harfler karışık kartlar olur) ve "Kelimelerden cümle" (öğretmen cümle
yazar, kelimeler karışık kartlar). İsteğe bağlı "Hecelere ayır" kipi: öğretmen heceleri tire ile yazar (ka-lem), kartlar hece.
Öğrenci kartları sürükleyerek ya da kart + boş yere dokunarak dizer; "Kontrol et" (tr-TR karşılaştırma), "Karıştır".
1–5 soru (kelime/cümle) tek parçada sırayla: "Sonraki" düğmesi. Büyük harf / küçük harf gösterimi seçeneği.
```

## İstem 24 – Hızlı anket (Doğru/Yanlış ya da 2–4 seçenek)

```
GÖREV: Parça (kind: 'poll', grup: Soru ve etkinlik). Öğretmen soru ve 2–4 seçenek yazar; "Doğru/Yanlış" ve "Evet/Hayır"
hazır şablonları. Öğrenciler kendi cihazından OY VERMEZ (bu sürümde yok): öğretmen el kaldıranları sayar, her seçeneğin
yanındaki +/− düğmeleriyle sayıyı girer. Sonuç yatay çubuk grafik + yüzde. "Sonucu gizle/göster", "Sıfırla".
İsteğe bağlı doğru seçenek işareti; "Doğruyu göster" basılınca o seçenek yeşil olur. Sayılar kaydedilmez (oturumluk).
```

## İstem 25 – Trafik ışığı

```
GÖREV: Parça (kind: 'signal', grup: Sınıf araçları). Dikey üç lamba: kırmızı "Sessiz çalışma", sarı "Fısıltıyla / grup",
yeşil "Serbest konuşma". Öğretmen lamba adlarını değiştirebilir. Lambaya dokununca yalnız o yanar (diğerleri soluk);
altında büyük yazıyla durum adı. Mikrofon ya da ses ölçümü YOK. Renk körlüğü için yanan lambada ikon/şekil farkı da olsun.
```

## İstem 26 – Onluk bloklar ve para

```
GÖREV: Parça (kind: 'manipulatives', grup: Matematik). İki set: "Onluk taban blokları" (birlik küp, onluk çubuk, yüzlük
plaka) ve "Para" (1, 5, 10, 25, 50 kuruş, 1 TL madeni; 5, 10, 20, 50, 100, 200 TL banknot — gerçek banknot görseli
KULLANMA, sade renkli dikdörtgen + tutar yazısı). Parçanın solunda kaynak tepsisi; oradan sürüklenen her parça çalışma
alanına kopyalanır, alan içinde serbest taşınır, tepsiye geri sürüklenince silinir. Üstte anlık toplam (ör. "1 yüzlük,
3 onluk, 4 birlik = 134" / "12,75 TL"). "Boz" (onluğu 10 birliğe) ve "Grupla" (10 birliği onluğa) düğmeleri seçili parçaya
uygulanır. "Temizle". Öğretmen başlangıç düzenini kaydedebilir (parça verisine), öğrencinin yaptıkları kaydedilmez.
```

## İstem 27 – Açılır pencere ikonları (ipucu, bilgi, soru, dikkat, örnek)

```
GÖREV: Tahtaya yerleştirilen küçük bir ikon (kind: 'popup', grup: Soru ve etkinlik); dokununca tahtanın üstünde pencere
(modal) açılır. Pencerenin içeriği GİZLİ BİR TAHTA SAYFASIDIR — böylece içine her öğe (yazı, görsel, şekil, parçalar) normal
düzenleyiciyle konur.
- BoardPage'e isteğe bağlı popup?: { ownerId: string } alanı ekle (ownerId = ikon parçasının id'si). Bu sayfalar sayfa
  şeridinde, sayfa sayacında, sunumda ileri/geri geçişte ve yazdırmada GÖRÜNMEZ; MAX_PAGES sınırına sayılmaz ama en fazla
  20 açılır sayfa. Normalize: sahibi olmayan açılır sayfa silinmez, ilk boş ikona bağlanmaz; normal sayfaya çevrilir.
- İkon türleri: ipucu (ampul, amber), bilgi (i, mavi), soru (?, mor), dikkat (!, kırmızı), örnek (kalem, yeşil). Ayarlarda
  tür ve isteğe bağlı kısa etiket ("İpucu 1"). İkon yuvarlak, en az 44×44 px dokunma alanı, hafif nabız animasyonu
  (prefers-reduced-motion'da yok).
- Düzenleyicide ikon seçiliyken ayar panelinde "İçeriği düzenle": açılır sayfa düzenleyicide açılır, üstte şerit
  "Açılır pencere: İpucu 1 · ← Tahtaya dön". İkon eklenince boş açılır sayfa otomatik oluşur. İkon silinince sayfası da silinir
  (onay penceresiyle; geri alınabilir). İkon kopyalanınca sayfası da kopyalanır.
- Pencere boyutu TAM EKRAN DEĞİLDİR: tahtanın üstünde ortalanmış pencere, arkadaki tahta yarı saydam örtüyle soluk görünür.
  Ayarlarda boyut: Küçük (tahta genişliğinin %45'i), Orta (%65, varsayılan), Büyük (%85). Pencerenin oranı sabit 4:3 olsun;
  açılır sayfanın düzenleyicide de yalnızca bu 4:3'lük alanı kullanılır (dışı soluk gösterilir), böylece öğretmen
  pencerede ne görüneceğini düzenlerken görür.
- Ders kipinde ve öğrenci görünümünde ikona dokununca modal: başlıkta tür ikonu + etiket, gövdede açılır sayfanın 4:3 alanı
  pencere boyutuna ölçeklenmiş çizilir ve içindeki parçalar etkileşimli çalışır; Kapat düğmesi, Esc, arka plana dokunma kapatır.
  Odak modal içinde kalır, kapanınca ikona döner (useDialog/ConfirmDialog kalıbına bak).
- Kütüphaneye kaydetme ve topluluk kopyalama: açılır sayfalar tahtayla birlikte taşınır; ikon tek başına kütüphaneye kaydedilemez.
Bu iş büyük; önce veri modeli + düzenleme, sonra ders/öğrenci modalı olarak iki adımda yapıp her adımda tsc/eslint çalıştır.
```
