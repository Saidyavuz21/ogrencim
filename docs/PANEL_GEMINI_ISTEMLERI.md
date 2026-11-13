# Öğretmen paneli – Gemini istemleri

Kullanım: istemi Gemini'ye olduğu gibi yapıştır. Bitince raporunu Claude'a yapıştır; Claude kontrol edip yayınlar.

## İstem P1 – Sol menü ve ana sayfaya renk (13 Kasım 2026)

```
Proje: tofutr.com okul portalı (Next.js + Supabase, TypeScript, CSS Modules). Çalışma klasörü: F:\Web Site\ogrenci
ÖNCE OKU: AGENTS.md, DESIGN.md, docs/UI_KURALLARI.md. Veritabanına ve supabase/ klasörüne DOKUNMA. git commit/push YAPMA.

GÖREV: Öğretmen panelinin sol menüsünü (src/components/teacher/TeacherSidebar.tsx) ve ana sayfa kartlarını
(Hızlı işlemler, Sınıf araçları, Çalışma alanlarım, Sınıf yönetimi; src/components/teacher/ altında) daha renkli yap.
Sol menüde senin (ya da önceki işin) commit edilmemiş değişiklikleri var; onları koru, üzerine çalış.

Renk düzeni: tek bir sabit dosyada tanımla (ör. src/components/teacher/teacherColors.ts ya da TeacherDashboard.module.css
içinde CSS değişkenleri --tone-*-bg / --tone-*-fg). Her ton: açık zemin + koyu ikon, ikon/zemin kontrastı en az 3:1,
yazı rengi değişmez (koyu nötr kalır). Düşük doygunluk, DESIGN.md'deki yeşil/sıcak nötr dile uyumlu:
- yeşil  (#e6f0ea / #25634b): Ödevler, Ödev gönder, Ödev kontrolü
- amber  (#fbf0d9 / #8a5a0b): Puan, Puan ver, Sınıf karnesi
- mavi   (#e7eff8 / #24527a): Ders, Tahtalarım, Soru bankası
- turkuaz(#e2f2f1 / #1d6560): Sınıf, Öğrenciler, Sınıflarım, Gruplama
- kum    (#f1eee6 / #5d5547): Okul, Dosyalarım
- mor    (#efeaf6 / #5b3c88): Topluluk, Geri sayım
- turuncu(#f8eee2 / #8a4f17): Araçlar, Rastgele seçici, Kronometre
Aynı kavram her yerde aynı renkte olsun (menüdeki "Puan" ile karttaki "Puan ver" aynı ton).

Sol menü: her öğenin ikonu yuvarlatılmış (10 px) renkli kutu içinde; seçili öğe kendi tonunun zemini + ince aynı ton
kenarlıkla belirgin, aria-current="page" korunur. Etiket yazısı koyu nötr kalır. Dar (yalnız ikon) ve geniş hâlde de çalışsın.
Ana sayfa: Hızlı işlemler satırlarındaki ikon kutuları, Çalışma alanlarım ve Sınıf yönetimi ikonları, Sınıf araçları
daireleri yukarıdaki tonlarla. Kart zemini beyaz, başlıklar değişmez; büyük renkli zemin, gradyan, gölge EKLEME.
Hover: satır zemini çok açık nötr; odak halkası görünür. Dokunma alanı en az 44×44 px. Mobil görünüm de aynı renkleri kullansın.

Bitince: npx tsc --noEmit -p .  ve  npx eslint <değiştirdiğin dosyalar>. Rapor: dosyalar, yapılamayanlar, "görsel kontrol yapılmadı".
```
