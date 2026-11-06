# EduBoard Yol Haritası ↔ ogrenci Karşılaştırması

Son güncelleme: 6 Kasım 2026
Kaynak: [`eduboard_roadmap.md`](../eduboard_roadmap.md) (Bölüm 1: Faz 1 → Faz 4, Bölüm 2: 5 adımlı kod üretim promptları)
Karşılaştırılan: bu depo (Next.js 16 + Supabase), `supabase/migrations/` ve `src/` içeriği

**Durum işaretleri**

| İşaret | Anlamı |
|---|---|
| ✅ | Bizde var, aynı işi görüyor |
| 🟡 | Kısmen var ya da farklı biçimde çözülmüş (açıklamada fark yazılı) |
| ❌ | Yok |
| ➖ | Bizde gerekmiyor: EduBoard'un kendi altyapısına (NestJS, Prisma, Redis, S3) özgü; Supabase'de karşılığı farklı ya da gereksiz |

> Karar notu: EduBoard'daki tahta ve quiz özellikleri ogrenci'ye **Supabase üzerinde** eklenecek; NestJS yığınına geçilmeyecek. Veli rolü bilinçli olarak kaldırıldı (her çocuğa tek öğrenci hesabı).

---

## 1. Özet

| # | Modül | EduBoard maddesi | ✅ | 🟡 | ❌ | ➖ | Bizde ek satır |
|---|---|---|---|---|---|---|---|
| 1 | Kimlik, giriş, hesaplar | 7 | 2 | 2 | 1 | 2 | 5 |
| 2 | Sınıf yönetimi | 4 | 1 | 2 | 1 | 0 | 1 |
| 3 | Etkileşimli tahta (tuval editörü) | 10 | 0 | 0 | 10 | 0 | 0 |
| 4 | Tahta parçaları (widget) | 9 | 0 | 0 | 9 | 0 | 0 |
| 5 | Klasör ve içerik düzeni | 4 | 0 | 0 | 4 | 0 | 0 |
| 6 | Yayın ve değerlendirme | 10 | 0 | 3 | 7 | 0 | 2 |
| 7 | Teslim ve otomatik kayıt | 7 | 0 | 1 | 6 | 0 | 0 |
| 8 | Analitik ve raporlama | 3 | 0 | 1 | 2 | 0 | 2 |
| 9 | Medya ve depolama | 9 | 2 | 0 | 6 | 1 | 1 |
| 10 | Topluluk / Keşfet pazaryeri (Faz 1c) | 16 | 0 | 0 | 16 | 0 | 0 |
| 11 | Canlı ders (Faz 2) | 9 | 1 | 0 | 8 | 0 | 0 |
| 12 | Okul düzeyi, çok kiracılı yapı (Faz 3) | 7 | 0 | 3 | 3 | 1 | 2 |
| 13 | Yapay zekâ (Faz 4) | 6 | 0 | 0 | 6 | 0 | 0 |
| 14 | Güvenlik | 12 | 1 | 4 | 4 | 3 | 4 |
| 15 | KVKK ve gizlilik (Faz 1b) | 7 | 0 | 2 | 5 | 0 | 0 |
| 16 | Gözlemlenebilirlik | 6 | 0 | 1 | 4 | 1 | 0 |
| 17 | Test ve kalite | 9 | 0 | 1 | 8 | 0 | 0 |
| | **Toplam** | **135** | **7** | **20** | **100** | **8** | **17** |

Sayım kuralı: Yalnızca EduBoard yol haritasında geçen maddeler sayıldı. Tablolarda *Bizde ek:* ile başlayan satırlar EduBoard'da olmayan, karşılaştırmaya bağlam için eklenmiş özelliklerimizdir; sayıma girmez. Aynı madde yol haritasında birden çok yerde geçiyorsa (ör. Faz 1 ve Adım 3) bir kez sayıldı.

**Kısaca:** EduBoard'un 135 maddesinin 7'si bizde aynen, 20'si kısmen ya da farklı biçimde var; 8'i bizim altyapıda gerekmiyor; 100'ü yok. ogrenci, EduBoard'un **sınıf yönetimi, okul yapısı, güvenli giriş ve iletişim** tarafında güçlü; EduBoard'un **çekirdeği olan etkileşimli tahta, quiz/sınav motoru, içerik kütüphanesi ve topluluk** tarafı bizde hiç yok. Buna karşılık ogrenci'de EduBoard'da olmayan 20'den fazla özellik var (bkz. [Bölüm 3](#3-bizde-olup-eduboardda-olmayanlar)).

---

## 2. Modül modül karşılaştırma

### 1. Kimlik, giriş, hesaplar

| EduBoard özelliği | Kaynak | Bizde | Açıklama / kanıt |
|---|---|---|---|
| Rol modeli: Öğretmen, Öğrenci | Faz 1 · 1.1 | ✅ | Roller: `admin` (süper admin), `ogretmen`, öğrenci (anonim oturum + PIN). EduBoard'da süper admin yok, bizde var. |
| Öğretmen bağımsız kayıt | Faz 1 · 1.2 | ✅ | E-posta + şifre, iki adımlı form ([AuthPage.tsx](../src/components/auth/AuthPage.tsx)). |
| *Bizde ek:* Öğretmen kaydında doğrulama | — | ✅ | EduBoard'da yok, bizde fazlası var: öğretmenlik belgesi (PDF/JPG/PNG) + süper admin onayı. |
| Öğrenci sınıf kodu ile kendi kaydolur | Faz 1 · 1.2 | 🟡 | Bizde öğrenci kendisi kaydolmaz; öğretmen ya da admin ekler (tek tek veya liste yapıştırarak). Giriş: okul + okul numarası + 4 haneli PIN. |
| Öğrenci kayıt hız sınırı (5/dk/öğrenci) | Faz 1 · 1.2 | 🟡 | Kayıt yok, ama giriş korumalı: hesap başına 5 hatalı PIN → 15 dk kilit; oturum başına 15 dk'da 10 hatalı deneme sınırı (`pin_attempts`). |
| Sınıf kodu tahmin koruması (IP başına 20 hata/15 dk) | Faz 1 · 1.2 | ❌ | Sınıf kodu olmadığı için gerek yok; ama anonim girişte CAPTCHA da yok (Aşama 5'te bekliyor). |
| JWT: erişim 15 dk, yenileme 7 gün, rotasyon | Faz 1 · 1.3 | ➖ | Supabase Auth hallediyor (otomatik yenileme açık). |
| Yenileme jetonu tekrar kullanımında tüm oturumları kapatma | Faz 1 · 1.3 | ➖ | Supabase Auth'un kendi mekanizması. |
| *Bizde ek:* Oturum kapatma / zorla çıkış | — | ✅ | PIN değişince öğrencinin açık oturumları silinir (`student_sessions`); pasife alınan öğretmen anında erişimini kaybeder. |
| *Bizde ek:* Şifre değiştirme | — | ✅ | Profil sayfasında ([TeacherProfilePage.tsx](../src/components/teacher/TeacherProfilePage.tsx)). |
| *Bizde ek:* Öğretmen pasife alma / silme | — | ✅ | Süper admin → Öğretmenler. |
| *Bizde ek:* Sızdırılmış şifre koruması | — | 🟡 | Supabase panelinden açılması bekliyor (YOL_HARITASI Aşama 1). |

### 2. Sınıf yönetimi

| EduBoard özelliği | Kaynak | Bizde | Açıklama / kanıt |
|---|---|---|---|
| Sınıf (Classroom) modeli | Faz 1 · 1.1 | ✅ | `teacher_classes` (öğretmenin sınıfları) + öğrencinin `class_name` alanı + rehberlik sınıfı. |
| 8 karakterli sınıf kodu (Crockford Base32) | Faz 1 · 1.1, Adım 3 | ❌ | Yok. Not: "Sınıflarım" sayfasının açıklamasında "katılım kodu" yazıyor ama böyle bir özellik yok ([teacherPages.ts](../src/components/teacher/teacherPages.ts)). |
| Sınıf üyeliği (ClassroomMember) | Adım 1 | 🟡 | Ayrı üyelik tablosu yok; öğrenci tek sınıfa bağlı (`students.class_name`). Bir öğrencinin birden çok sınıfı olamaz. |
| Bir tahtayı farklı sınıflara farklı ayarla yayınlama | Faz 1 · 1.1 | 🟡 | Ödev tek sınıfa verilir; aynı ödevi birden çok sınıfa tek seferde gönderme yok (sınıf grubu mesajında var). |
| *Bizde ek:* Okula göre sınıf ayrımı | — | ✅ | EduBoard Faz 1'de yok; bizde sınıflar okula göre ayrılır (admin → Sınıflar). |

### 3. Etkileşimli tahta (tuval editörü)

| EduBoard özelliği | Kaynak | Bizde |
|---|---|---|
| Konva tabanlı çizim tuvali | Faz 1 · 1.2, Adım 4 | ❌ |
| Serbest kalem / fırça | Faz 1 · 1.2 | ❌ |
| Geometrik şekiller | Faz 1 · 1.2 | ❌ |
| Şablon zeminler (kareli, çizgili vb.) | Faz 1 · 1.2 | ❌ |
| Modal notlar (tahtaya not) | Faz 1 · 1.2 | ❌ |
| Geri al / yinele (en çok 50 adım) | Faz 1 · 1.2, Adım 4 | ❌ |
| Sanal çözünürlük (1920×1080, her ekrana ölçeklenir) | Faz 1 · 1.2, Adım 4 | ❌ |
| Tahta boyut sınırı (5 MB), öğrenci çizimi sınırı (2 MB) | Faz 1 · 1.1, Adım 1 | ❌ |
| Öğretmen / öğrenci modu (düzenleyici / görüntüleyici) | Adım 4 | ❌ |
| Ortak medya çekmecesi: hazır eğitim görsellerini tuvale sürükle-bırak | Faz 1c | ❌ |

### 4. Tahta parçaları (widget)

| EduBoard özelliği | Kaynak | Bizde | Açıklama |
|---|---|---|---|
| Mini Test (çoktan seçmeli soru) | Faz 1 · 1.2 | ❌ | |
| Cevabı Göster | Faz 1 · 1.2 | ❌ | |
| Adım Adım (çözümü basamak basamak açma) | Faz 1 · 1.2 | ❌ | |
| Kronometre | Faz 1 · 1.2 | ❌ | Hiçbir sayfada süre tutma ya da geri sayım aracı yok. |
| Sürükle-bırak eşleştirme | Faz 2 | ❌ | |
| Sesli notlar | Faz 2 | ❌ | |
| Rastgele öğrenci seçici | Faz 2 | ❌ | Öğrenci listesi hazır; en kolay eklenecek araç. |
| Parçalar çizimin üstünde HTML katmanı olarak | Faz 1 · 1.2, Adım 4 | ❌ | |
| Doğru cevaplar asla tarayıcıya gitmez ("Zero Trust") | Güvenlik çerçevesi | ❌ | Soru motoru olmadığı için henüz yok; eklenirken RLS + sunucu fonksiyonu ile yapılmalı. |

### 5. Klasör ve içerik düzeni

| EduBoard özelliği | Kaynak | Bizde | Açıklama |
|---|---|---|---|
| Klasörler (Folder) | Faz 1 · 1.1 | ❌ | Planlanan "Öğretmen dosyaları" modülü bu boşluğu kısmen kapatır (ders + etiket ile). |
| Sürükleyerek sıralama (fractional indexing) | Faz 1 · 1.1 | ❌ | |
| Tahta setleri (BoardCollection, ör. "8. Sınıf LGS Matematik Seti") | Faz 1 · 1.1 | ❌ | |
| Tahta etiketleri: kademe, branş, konu, etiket | Adım 1 | ❌ | Branş listesi ve sınıf seviyeleri var ama içeriğe bağlı değil. |

### 6. Yayın ve değerlendirme

| EduBoard özelliği | Kaynak | Bizde | Açıklama / kanıt |
|---|---|---|---|
| Sınıfa yayınlama | Faz 1 · 1.1 | 🟡 | Bizdeki karşılığı **ödev**: başlık, ders, açıklama, teslim tarihi, puan, bağlantı, PDF/resim eki ([TeacherAssignmentsPage.tsx](../src/components/teacher/TeacherAssignmentsPage.tsx)). |
| Alıştırma modu (anında dönüt) | Faz 1 · 1.2 | ❌ | |
| Sınav modu (teslim tarihine kadar sonuç gizli) | Faz 1 · 1.2 | ❌ | |
| Sınav modunda teslim tarihi zorunlu ve ileri bir tarih | Faz 1 · 1.2 | 🟡 | Ödevde teslim tarihi isteğe bağlı; geçmiş tarih engellenmiyor. |
| Soru başına 3 deneme hakkı | Faz 1 · 1.2 | ❌ | |
| Doğru cevabın sonradan bozulmaması | Faz 1 · 1.2 | ❌ | |
| Doğru cevap başına puan (10) | Faz 1 · 1.2 | 🟡 | Otomatik puanlama yok; öğretmen ödev kontrolünde puan girer. Ödev kontrolü davranış puanı da verir (Yaptı +1, Kısmen 0, Yapmadı −1). |
| Soru başına 3 sn tekrar sınırı (bot koruması) | Faz 1 · 1.2 | ❌ | |
| Sonuçları açıklama (`isResultsPublished`) | Adım 1 | ❌ | Ödev kontrol sonucu öğrenciye hemen görünür; öğretmen "sonra açıkla" diyemez. |
| *Bizde ek:* Öğretmenin elle değerlendirmesi | — | ✅ | Ödev kontrolü: Yaptı / Kısmen / Yapmadı + puan + not ([TeacherCheckPage.tsx](../src/components/teacher/TeacherCheckPage.tsx)). |
| *Bizde ek:* Sınav notu girişi | — | 🟡 | EduBoard'da yok ama yakın: bizde ders + not türü ile not girişi (1-3. yazılı, 1-2. sözlü, 1-2. performans, proje). |
| Gelen seçimlerin tahtadaki sorulara karşı doğrulanması | Faz 1 · 1.2 | ❌ | |

### 7. Teslim ve otomatik kayıt

| EduBoard özelliği | Kaynak | Bizde | Açıklama |
|---|---|---|---|
| Öğrenci teslimi (Submission: taslak / teslim edildi / kapandı) | Faz 1 · 1.1 | 🟡 | Ödev kontrol kaydı (`homework_checks`) var ama öğrencinin kendisi teslim edemez; dosya yükleme teslimi bekliyor (YOL_HARITASI Aşama 2). |
| 30 sn'de bir çizim kaydı | Faz 1 · 1.2, Adım 4 | ❌ | |
| Sayfa kapanırken son cevapları kurtarma | Faz 1 · 1.2, Adım 4 | ❌ | |
| Alıştırma modunda kapanış kaydının engellenmesi | Faz 1 · 1.2 | ❌ | |
| Süresi dolan teslime yazmayı engelleyen kilit (409) | Faz 1 · 1.2 | ❌ | |
| Teslim tarihi zamanlayıcısı (cron) ile otomatik kapanış | Faz 1 · 1.2 | ❌ | |
| İlk deneme satırlarını peşin açma | Faz 1 · 1.2 | ❌ | Soru motoru yokken gerekmiyor. |

### 8. Analitik ve raporlama

| EduBoard özelliği | Kaynak | Bizde | Açıklama |
|---|---|---|---|
| Soru bazında ısı haritası (başarı oranı) | Faz 1 · 1.2 | ❌ | |
| *Bizde ek:* Puan / başarı sıralaması | — | 🟡 | Bizde davranış puanına göre sınıf sıralaması ve renk kademeleri var; soru başarısına göre değil. |
| *Bizde ek:* Öğrenci not ortalaması | — | 🟡 | Öğrenci tarafında ders ortalaması ve genel ortalama var; öğretmen için sınıf karnesi / ders raporu yok. |
| Öğrenci çözüm çizimini inceleme | Faz 1 · 1.2 | ❌ | |
| Görsel ve PDF dışa aktarma (tahtayı PNG/PDF olarak) | Güvenlik çerçevesi, Adım 4 | 🟡 | Tahta yok; ama toplu öğrenci eklemede PIN listesi CSV indirme ve yazdırma var. |

### 9. Medya ve depolama

| EduBoard özelliği | Kaynak | Bizde | Açıklama / kanıt |
|---|---|---|---|
| Özel dosyalar, süreli imzalı bağlantı | Güvenlik çerçevesi | ✅ | Supabase Storage, özel bucket'lar; imzalı bağlantı 10 dk (EduBoard 5 dk). |
| Dosya türü / boyut sınırı | Faz 1 · 1.2 | ✅ | Ödev eki: PDF + görsel, 10 MB; öğretmen belgesi: PDF/JPG/PNG, 5 MB (bucket düzeyinde). |
| Dosya içeriğine bakarak tür doğrulama (magic-byte) | Faz 1 · 1.2 | ❌ | Bizde yalnızca MIME türü kontrolü. |
| Kullanıcı başına kota (500 MB) | Faz 1 · 1.1 | ❌ | |
| Kotanın aynı anda yüklemelerde de doğru tutulması | Faz 1 · 1.2 | ❌ | |
| Gece kota mutabakatı (cron) | Faz 1c | ❌ | |
| Kopyalamada kota ayırma, hata olursa dosyaları silip kotayı iade etme | Faz 1c | ❌ | |
| Ortak eğitim medya kütüphanesi (kotadan muaf) | Faz 1 · 1.1, Adım 3 | ❌ | |
| *Bizde ek:* Silinen kayıtla birlikte dosyaların temizlenmesi | — | 🟡 | Ödev ve öğretmen silinirken dosyaları temizleniyor; genel bir temizlik görevi yok. |
| S3 uyumlu depolama, CORS ayarı | Genel mimari | ➖ | Supabase Storage kullanılıyor. |

### 10. Topluluk / Keşfet pazaryeri (Faz 1c)

| EduBoard özelliği | Bizde |
|---|---|
| Tahtayı herkese açık paylaşma (`isPublic`) | ❌ |
| Başka öğretmenin tahtasını kopyalama (fork / remix) | ❌ |
| Kopya sayısı | ❌ |
| Orijinal yazara atıf, soy ağacı | ❌ |
| 1–5 yıldız puanlama | ❌ |
| Favoriler | ❌ |
| Kademe (1–12) ile filtreleme | ❌ |
| Branş ile filtreleme | ❌ |
| MEB kazanım kodu (ör. `MAT.8.1.1.1`) | ❌ |
| İçerik biçimi ile filtreleme | ❌ |
| Trendler (son 14 gün) | ❌ |
| En yüksek puanlılar (ağırlıklı puan) | ❌ |
| En çok kullanılanlar | ❌ |
| En yeniler / müfredata güncel | ❌ |
| Editörün seçimi rozeti (pedagojik onaylı içerik) | ❌ |
| Kopyalamadan önce hızlı önizleme (sayfaları ve soruları gezme) | ❌ |

### 11. Canlı ders (Faz 2)

| EduBoard özelliği | Bizde | Açıklama |
|---|---|---|
| Gerçek zamanlı bağlantı (WebSocket) | ✅ | Supabase Realtime: mesajlar canlı, 30 sn yedek yenileme ([useLiveMessages.ts](../src/lib/useLiveMessages.ts)). |
| Anlık quiz (ders sırasında bütün sınıfa soru) | ❌ | |
| Öğrenciye 30 sn kalem izni | ❌ | |
| Öğrenci çözümünü sınıfa yansıtma | ❌ | |
| Sürükle-bırak eşleştirme | ❌ | |
| Sesli notlar | ❌ | |
| Rastgele öğrenci seçici | ❌ | |
| Eşzamanlı ortak düzenleme (CRDT / Yjs) | ❌ | |
| Tahta değişiklik geçmişi ve anlık görüntüler | ❌ | |

### 12. Okul düzeyi, çok kiracılı yapı (Faz 3)

| EduBoard özelliği | Bizde | Açıklama / kanıt |
|---|---|---|
| Kurum → şube → sınıf hiyerarşisi | 🟡 | Okul → sınıf var (`schools`, il/ilçe, 81 il 973 ilçe); şube/kampüs katmanı yok. |
| Okul başına veri ayrımı (RLS) | 🟡 | Öğrenci, öğretmen ve ödev okula bağlı; öğretmen yalnızca kendi okulunu görür (`my_school_id`). **İstisna: duyurular** (bkz. [Bölüm 4](#4-tespit-edilen-açıklar-ve-tutarsızlıklar)). |
| Okul yöneticisi rolü (SchoolAdmin) | ❌ | Yalnızca süper admin var; okul bazlı yönetici yok. |
| Veli rolü | ➖ | Bilinçli olarak kaldırıldı (tek öğrenci hesabı kararı). |
| Çoklu rol (bir kişi A okulunda öğretmen, B'de veli) | ❌ | |
| *Bizde ek:* Okul başvurusu, onay, birleştirme | ✅ | EduBoard'da yok; bizde öğretmen "okulum listede yok" der, admin onaylar ya da birleştirir. |
| *Bizde ek:* Toplu okul ekleme | ✅ | İlçeye toplu ekleme + Excel'den yapıştırma. |
| Okul şablonları, zümre klasörleri | ❌ | |
| Her istekte okul kimliği denetimi | 🟡 | Ayrı başlık yerine her sorguda RLS ile oturumdaki kullanıcının okulu kullanılıyor; amaç aynı. |

### 13. Yapay zekâ (Faz 4)

| EduBoard özelliği | Bizde |
|---|---|
| Öğretmen asistanı: kazanım + seviye → soru, şema, çizim taslağı | ❌ |
| Mikro-kazanım bazında eksik analizi haritası | ❌ |
| Öğrenciye özel çalışma kâğıdı | ❌ |
| KVKK: açık rıza, veri işleme sözleşmesi, yerel model ya da anonimleştirme | ❌ |
| Yapay zekâ çıktısının öğretmen onayından geçmesi, otomatik puanlama yasağı | ❌ |
| Prompt injection savunması | ❌ |

### 14. Güvenlik

| EduBoard özelliği | Kaynak | Bizde | Açıklama / kanıt |
|---|---|---|---|
| Satır düzeyinde yetki (RLS) | Faz 3 | ✅ | Bütün tablolarda; EduBoard bunu Faz 3'e bırakıyor, bizde baştan var. |
| Uygulama düzeyinde şifreleme (AES-256-GCM) | Güvenlik çerçevesi, Faz 1 · 1.3 | 🟡 | Öğrenci PIN'i Supabase Vault anahtarıyla şifreli (`pgp_sym_encrypt`); PIN girişi bcrypt hash ile doğrulanır. |
| Anahtar yönetimi (Vault / KMS), anahtar yenileme | Faz 1b | 🟡 | Vault var; anahtar yenileme (rotation) yok. |
| Gizli anahtar sızıntı taraması (gitleaks) | Faz 1 · 1.3, Adım 1 | ❌ | Not: eski admin şifresi git geçmişinde açık; değiştirilmesi bekliyor. |
| Yönetici işlemlerinin kayda geçmesi (AuditLog) | Faz 1 · 1.3 | ❌ | |
| Kayıtta eski/yeni değerler, işlemi yapanın rolü | Faz 1b | ❌ | |
| Katmanlı hız sınırı (giriş, API 120/dk, WebSocket 60/sn) | Faz 1b | 🟡 | Yalnızca PIN girişinde deneme sınırı var; genel API sınırı Supabase varsayılanları. |
| Aynı isteğin iki kez işlenmesini önleme (Idempotency-Key) | Faz 1b | ❌ | |
| Eşzamanlı işlemlerde kilit (advisory lock) | Güvenlik çerçevesi | ➖ | Puan verme, ödev puanı gibi işlemler zaten tek sunucu fonksiyonunda ve tek işlemde. |
| *Bizde ek:* Sunucu fonksiyonlarında yetki kontrolü | — | ✅ | `is_admin`, `is_staff`, `staff_can_manage_student` vb. `security definer` fonksiyonlar. |
| *Bizde ek:* Yalnızca kendi sınıfındaki öğrenciyi yönetme | — | ✅ | Öğretmen yalnızca kendi sınıflarındaki öğrenciyi ekler, taşır, PIN'ini görür, siler. |
| *Bizde ek:* Admin hesaplarının korunması | — | ✅ | Admin pasife alınamaz, onayı kaldırılamaz (`profiles_protect_admin`). |
| Ortak doğrulama şemaları (Zod sözleşmeleri, tarayıcı ve sunucu aynı kuralı kullanır) | Genel mimari, Adım 2 | 🟡 | Ortak şema yok; kritik kurallar (PIN biçimi, yetki, zorunlu alanlar) sunucu fonksiyonlarında tekrar denetleniyor, tarayıcıda ayrıca yazılı. |
| Ortam değişkenlerinin tip güvenli doğrulanması | Genel mimari | ➖ | NestJS'e özgü; bizde yalnızca iki herkese açık değişken var. |
| BigInt JSON hatası önlemi | Faz 1 · 1.2 | ➖ | Bizde BigInt alan yok. |
| *Bizde ek:* Anonim girişe CAPTCHA | — | ❌ | EduBoard'da yok; bizde de henüz yok (YOL_HARITASI Aşama 5). |

### 15. KVKK ve gizlilik (Faz 1b)

| EduBoard özelliği | Bizde | Açıklama |
|---|---|---|
| Yumuşak silme (soft-delete) | ❌ | Silme kalıcı. |
| Unutulma hakkı | 🟡 | Öğrenci silinince puanları, notları, ödev kayıtları ve mesajları da silinir; ama talep akışı ve kaydı yok. |
| Kişisel veri anonimleştirme | ❌ | |
| Kişinin verilerini dışa aktarma | ❌ | |
| Herkese açık paylaşımdan önce öğrenci adı/not taraması | ❌ | Paylaşım özelliği olmadığı için şimdilik gerekmiyor. |
| Aydınlatma metni ve veli açık rızası | ❌ | YOL_HARITASI Aşama 6. |
| Erişim kaydı (kim hangi öğrencinin verisini gördü/değiştirdi) | 🟡 | Yok; yalnızca puan geçmişinde puanı veren öğretmen tutuluyor. |

### 16. Gözlemlenebilirlik

| EduBoard özelliği | Bizde | Açıklama |
|---|---|---|
| Yapısal günlük (Pino JSON) | ➖ | Sunucu kodumuz Supabase fonksiyonları; günlükler Supabase panelinde. |
| Günlükte kişisel verinin gizlenmesi | ❌ | |
| İstek takip kimliği (Correlation ID) | ❌ | |
| Hata izleme (Sentry) | ❌ | |
| Metrikler (Prometheus + Grafana) | ❌ | |
| Günlük saklama süresi (30 gün) | 🟡 | Supabase planının varsayılan süresi; bilinçli bir ayar yok. |

### 17. Test ve kalite

| EduBoard özelliği | Bizde | Açıklama |
|---|---|---|
| Birim testleri (Vitest) | ❌ | |
| Gerçek veritabanıyla entegrasyon testleri | ❌ | |
| Testler arası veri temizliği | ❌ | |
| Uçtan uca testler (Playwright) | ❌ | YOL_HARITASI Aşama 3'te elle akış testi planlı. |
| Tuval anlık görüntü testleri | ❌ | |
| Kapsam hedefleri (%80 / %60 / %100 kritik yol) | ❌ | |
| CI/CD (GitHub Actions) | ❌ | `.github` klasörü yok. |
| Örnek veri (seed) | ❌ | Bilinçli olarak kaldırıldı; gerçek veriyle çalışılıyor. |
| Tip kontrolü ve lint | 🟡 | `tsc` ve `eslint` elle çalıştırılıyor; otomatik değil. |

---

## 3. Bizde olup EduBoard'da olmayanlar

EduBoard tahta ve sınav odaklı bir araç; ogrenci ise okulun günlük işini yürüten bir portal. Bu yüzden şu özellikler yalnızca bizde var:

**Öğretmen**
- Ödev verme: ek dosya, bağlantı, teslim tarihi, puan
- Ödev kontrolü: Yaptı / Kısmen / Yapmadı, puan, not; otomatik davranış puanı (+1 / 0 / −1)
- Davranış puanı: artı/eksi puan ve gerekçe, puan geçmişi
- Puan sıralaması ve renk kademeleri
- Sınıf akvaryumu: puanla büyüyen balıklar, tam ekran
- Not girişi: ders + not türü (yazılı, sözlü, performans, proje)
- Öğrenci yönetimi: tekli ve toplu ekleme (liste yapıştır), PIN üretme, PIN görme, PIN listesini CSV olarak indirme ve yazdırma
- Mesajlaşma: öğrenciyle birebir ve sınıf grubu; grup mesajını birden çok sınıfa tek seferde gönderme; masaüstünde sohbet kutusu
- Okul duyuruları (önemli işaretiyle)
- Birden çok sınıf, rehberlik sınıfı

**Öğrenci**
- Ödevler (bekleyen / kontrol edilen, teslim etiketleri), notlar, puan geçmişi, sınıf sıralaması, akvaryum
- Öğretmenlerle mesajlaşma, duyurular, okunmamış mesaj ve yeni duyuru rozetleri
- Okul + numara + PIN ile giriş (okul cihazda hatırlanır)

**Süper admin**
- Öğretmen başvuruları (belge inceleme, onay, red)
- Okul başvuruları (onay, birleştirme), toplu okul ekleme (Excel'den yapıştırma)
- Öğretmen, öğrenci, okul, sınıf listeleri; arama ve filtreler
- 81 il ve 973 ilçenin tam listesi

---

## 4. Tespit edilen açıklar ve tutarsızlıklar

Karşılaştırma sırasında bulunan, EduBoard'dan bağımsız düzeltilmesi gereken noktalar:

1. **Duyurular okula göre ayrılmıyor.** Veritabanı kuralı (`announcements_select`) her öğretmene ve her öğrenciye **bütün okulların** duyurularını gösteriyor. `announcements_staff_write` kuralı da her öğretmenin **başka öğretmenlerin** duyurularını silmesine ve değiştirmesine izin veriyor. Bu, okul ayrımının tek açık noktası.
2. **"Sınıflarım" açıklaması yanlış:** "Sınıf ekle ve katılım kodu" yazıyor; katılım kodu özelliği yok ([teacherPages.ts](../src/components/teacher/teacherPages.ts)).
3. **YOL_HARITASI eskimiş:** 3 Kasım tarihli; o tarihten sonra yapılanlar (öğretmen belgesi, süper admin sayfaları, öğrenci paneli, PIN gösterimi, il/ilçe listesi) işlenmemiş; artık var olmayan dosyalardan (`ParentTeacherChat.tsx`) söz ediyor ve veli rolü hâlâ geçiyor.
4. **Sınıf grubu "okundu" bilgisi:** Grup mesajlarının okundu durumu tek alan; artık öğrenci açınca işaretlenmiyor, bu yüzden öğretmen grup mesajında hep "İletildi" görür. Kişi başına okundu bilgisi istenirse ayrı tablo gerekir.
5. **Eski PIN'ler bilinmiyor:** PIN gösterimi açılmadan önce verilmiş PIN'ler görünmez; yeni PIN verilene kadar listede "bilinmiyor" yazar.

---

## 5. Önerilen sıra

EduBoard'dan alınacak özellikleri, mevcut yapımıza en az maliyetle ve en çok fayda sağlayacak şekilde sıraladım:

| Sıra | İş | Neden | Veritabanı değişikliği |
|---|---|---|---|
| 0 | Duyuruları okula göre ayırmak ([Bölüm 4](#4-tespit-edilen-açıklar-ve-tutarsızlıklar), madde 1) | Veri sızıntısı; diğer her şeyden önce | Evet (küçük) |
| 1 | **Sınıf araçları:** rastgele öğrenci seçici, kronometre / geri sayım | Her gün kullanılır; öğrenci listesiyle hemen çalışır | Hayır |
| 2 | **Öğretmen dosyaları** (klasör / etiket, sınıfla paylaşım) | Klasör ve içerik düzeni boşluğunu kapatır; tahta içeriğinin de temeli olur | Evet |
| 3 | **Mini quiz:** çoktan seçmeli soru, alıştırma ve sınav modu, cevap anahtarı sunucuda | EduBoard'un çekirdeği; ödev yapısının üstüne kurulabilir | Evet |
| 4 | **Isı haritası ve sonuç açıklama** | Quiz verisiyle doğrudan gelir | Evet (quiz ile) |
| 5 | **Öğrenci teslimi** (dosya yükleme, teslim kilidi) | Zaten YOL_HARITASI'nda bekliyor | Evet |
| 6 | **Etkileşimli tahta** (çizim, şekiller, geri alma, Mini Test, Cevabı Göster, Adım Adım parçaları) | En büyük iş; quiz motoru hazır olunca | Evet |
| 7 | **Kayıt ve KVKK:** işlem kaydı, veri dışa aktarma, açık rıza | Gerçek okul verisiyle yayından önce gerekli | Evet |
| 8 | **Test ve CI:** temel uçtan uca testler, otomatik tip kontrolü ve lint | Özellik sayısı arttıkça gerileme riski artıyor | Hayır |
| 9 | Topluluk / Keşfet, canlı ders, yapay zekâ | İçerik ve kullanıcı sayısı oluştuktan sonra | Evet |
