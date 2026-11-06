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
| 2 | Ödev sistemini güçlendirme | 0 / 8 |
| 3 | Öğretmen dosyaları ve içerik düzeni | 0 / 8 |
| 4 | Quiz motoru | 0 / 10 |
| 5 | Analitik ve raporlama | 0 / 6 |
| 6 | Sınıf ve okul yapısı | 0 / 6 |
| 7 | Etkileşimli tahta | 0 / 14 |
| 8 | Canlı ders | 0 / 7 |
| 9 | Güvenlik ve KVKK | 0 / 13 |
| 10 | Kalite: test, CI, izleme | 0 / 7 |
| 11 | Topluluk / Keşfet | 0 / 9 |
| 12 | Yapay zekâ | 0 / 5 |
| | **Toplam** | **8 / 101** |

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

- [ ] **İyileştir:** Aynı ödevi birden çok sınıfa tek seferde verme — *K-2, K-6*
- [ ] **İyileştir:** Teslim tarihi doğrulaması (geçmiş tarih engeli) ve isteğe bağlı teslim saati — *K-6*
- [ ] **Sonuçları açıklama:** öğretmen kontrol sonucunu hemen ya da "sonra açıkla" ile gösterebilsin — *K-6*
- [ ] **Öğrenci teslimi:** öğrenci dosya/fotoğraf yükleyip teslim eder (taslak → teslim edildi) — *K-7*
- [ ] **Teslim kilidi:** teslim tarihi geçince ya da teslim edildikten sonra değişiklik yapılamaz — *K-7*
- [ ] **Otomatik kapanış:** teslim tarihi gelince ödev kendiliğinden kapanır (zamanlanmış görev) — *K-7*
- [ ] Öğretmene teslim durumu özeti: kaç kişi teslim etti, kim etmedi — *K-8*
- [ ] **İyileştir:** Dosya türünü içeriğe bakarak doğrulama (yalnızca uzantı/MIME değil) — *K-9*

## 3. Öğretmen dosyaları ve içerik düzeni

- [ ] **Dosyalarım** sayfası: yükle, listele, önizle (PDF, görsel), sil — *K-5, K-9*
- [ ] Klasörler ve sürükleyerek sıralama — *K-5*
- [ ] Etiketler: kademe, branş, konu, serbest etiket; bunlarla arama ve filtreleme — *K-5*
- [ ] Ödeve "Dosyalarımdan ekle" (yeniden yüklemeden) — *K-9*
- [ ] Sınıfla paylaşım; öğrenci panelinde "Ders materyalleri" — *K-5*
- [ ] Öğretmen başına depolama kotası ve kullanım göstergesi — *K-9*
- [ ] Setler: birden çok içeriği tek paket yapma (ör. "8. Sınıf LGS Matematik Seti") — *K-5*
- [ ] Ortak eğitim medya kütüphanesi (bütün öğretmenlerin kullanabildiği hazır görseller, kotadan muaf) — *K-9*

## 4. Quiz motoru

Doğru cevaplar asla tarayıcıya gönderilmez; değerlendirme sunucuda yapılır.

- [ ] Soru bankası: çoktan seçmeli soru (metin + görsel, 2–5 şık) oluşturma ve düzenleme — *K-4*
- [ ] Cevap anahtarı yalnızca sunucuda (RLS + sunucu fonksiyonu) — *K-4, K-14*
- [ ] Quiz'i sınıfa yayınlama (ödev altyapısıyla) — *K-6*
- [ ] **Alıştırma modu:** anında doğru/yanlış dönütü, soru başına 3 deneme — *K-6*
- [ ] **Sınav modu:** teslim tarihi zorunlu, tarih geçene kadar sonuç gizli — *K-6*
- [ ] Doğru çözülen sorunun sonradan bozulmaması; puanın sunucuda tek işlemde artması — *K-6*
- [ ] Soru başına kısa tekrar sınırı (art arda deneme koruması) — *K-6*
- [ ] Gelen cevabın quiz'in sorularına ait olduğunun doğrulanması — *K-6*
- [ ] Sayfa kapanırken son cevapların kaybolmaması (sınav modu) — *K-7*
- [ ] Öğrenci quiz ekranı (mobil uyumlu) ve sonuç ekranı — *K-6*

## 5. Analitik ve raporlama

- [ ] **Isı haritası:** soru bazında sınıf başarı oranı — *K-8*
- [ ] Öğretmen için sınıf karnesi: ders bazında not ortalamaları ve dağılım — *K-8*
- [ ] Öğrenci gelişim sayfası: puan ve not değişimi zaman içinde — *K-8*
- [ ] Not ve puan listelerini Excel/CSV olarak dışa aktarma — *K-8*
- [ ] Rapor ve tahtayı PDF/PNG olarak dışa aktarma — *K-8*
- [ ] Öğrencinin quiz/çözüm cevaplarını tek tek inceleme — *K-8*

## 6. Sınıf ve okul yapısı (iyileştir)

- [ ] **İyileştir:** Öğrenci birden çok sınıfa/derse üye olabilsin (sınıf üyeliği tablosu) — *K-2*
- [ ] Sınıf kodu ile katılım (öğrenci kendini sınıfa ekler, öğretmen onaylar) — *K-2*
- [ ] **Okul yöneticisi rolü:** kendi okulunun öğretmen ve öğrencilerini yönetir — *K-12*
- [ ] Şube / kampüs katmanı (okul → şube → sınıf) — *K-12*
- [ ] Okul şablonları ve zümre klasörleri (branş öğretmenlerinin ortak alanı) — *K-12*
- [ ] **İyileştir:** Sınıf grubu mesajında kişi başına "okundu" bilgisi — *K-11 (bizde ek)*

## 7. Etkileşimli tahta

- [ ] Çizim tuvali: kalem, silgi, renk, kalınlık — *K-3*
- [ ] Geometrik şekiller (çizgi, ok, dikdörtgen, daire) — *K-3*
- [ ] Şablon zeminler (kareli, çizgili, koordinat) — *K-3*
- [ ] Tahtaya not kutusu ve görsel ekleme — *K-3*
- [ ] Geri al / yinele (50 adım) — *K-3*
- [ ] Her ekrana orantılı ölçekleme (sabit sanal çözünürlük) — *K-3*
- [ ] Tahta ve öğrenci çizimi boyut sınırları — *K-3*
- [ ] Öğretmen düzenler, öğrenci görüntüler/çözer modu — *K-3*
- [ ] Tahtaya **Mini Test** parçası (quiz motorunu kullanır) — *K-4*
- [ ] Tahtaya **Cevabı Göster** parçası (sınav modunda sunucuda kapalı) — *K-4*
- [ ] Tahtaya **Adım Adım** çözüm parçası — *K-4*
- [ ] Tahtaya **Kronometre** parçası — *K-4*
- [ ] Öğrenci çiziminin otomatik kaydı (30 sn) — *K-7*
- [ ] Ortak medya çekmecesinden tahtaya sürükle-bırak — *K-3*

## 8. Canlı ders

- [ ] Anlık quiz: öğretmen ders sırasında soruyu bütün sınıfa açar, cevaplar canlı gelir — *K-11*
- [ ] Öğrenci çözümünü sınıfa yansıtma — *K-11*
- [ ] Öğrenciye süreli (30 sn) tahta kalemi izni — *K-11*
- [ ] Sürükle-bırak eşleştirme etkinliği — *K-4, K-11*
- [ ] Sesli not — *K-4, K-11*
- [ ] Tahtada eşzamanlı ortak çalışma — *K-11*
- [ ] Tahta değişiklik geçmişi ve geri dönme — *K-11*

## 9. Güvenlik ve KVKK

- [ ] Admin şifresini değiştir (eski şifre git geçmişinde açık) — *K-14*
- [ ] Supabase: sızdırılmış şifre korumasını aç — *K-1*
- [ ] Anonim öğrenci girişine CAPTCHA — *K-1, K-14*
- [ ] **İşlem kaydı:** kim, ne zaman, neyi değiştirdi/sildi (eski ve yeni değerle) — *K-14*
- [ ] Erişim kaydı: kim hangi öğrencinin verisini görüntüledi — *K-15*
- [ ] Gizli anahtar sızıntı taraması (gitleaks) — *K-14*
- [ ] PIN şifreleme anahtarını yenileme yöntemi — *K-14*
- [ ] Genel istek hız sınırları (giriş dışı uçlar) — *K-14*
- [ ] Yumuşak silme (yanlışlıkla silineni geri alma süresi) — *K-15*
- [ ] Öğrenci verilerini dışa aktarma (KVKK talebi) — *K-15*
- [ ] Silme talebi akışı ve kaydı (unutulma hakkı) — *K-15*
- [ ] Aydınlatma metni ve veli açık rızası — *K-15*
- [ ] Supabase güvenlik ve performans uyarılarını (advisors) sıfırlama — *K-14*

## 10. Kalite: test, CI, izleme

- [ ] Uçtan uca testler: öğretmen kaydı → onay → giriş → puan → ödev → mesaj → çıkış — *K-17*
- [ ] Veritabanı kuralları (RLS) için otomatik yetki testleri — *K-17*
- [ ] CI: her commit'te tip kontrolü, lint ve build (GitHub Actions) — *K-17*
- [ ] Hata izleme (ör. Sentry) — *K-16*
- [ ] Günlüklerde kişisel verinin gizlenmesi — *K-16*
- [ ] Yedekleme ve geri yükleme planı — *K-16*
- [ ] Büyük bileşenlerin bölünmesi ve Supabase tiplerinin otomatik üretilmesi — *K-17*

## 11. Topluluk / Keşfet

- [ ] İçeriği (tahta/quiz/set) herkese açık paylaşma — *K-10*
- [ ] Başka öğretmenin içeriğini kopyalayıp uyarlama, orijinal yazara atıf — *K-10*
- [ ] Kopyalamadan önce hızlı önizleme — *K-10*
- [ ] 1–5 yıldız ve favoriler — *K-10*
- [ ] Kademe, branş, **MEB kazanım kodu** ve biçime göre arama — *K-10*
- [ ] Trendler, en yüksek puanlılar, en çok kullanılanlar, en yeniler — *K-10*
- [ ] Editörün seçimi rozeti — *K-10*
- [ ] Paylaşım öncesi öğrenci adı/not taraması (KVKK) — *K-15*
- [ ] Kopyalamada kota ayırma ve hata olursa geri alma — *K-9*

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
