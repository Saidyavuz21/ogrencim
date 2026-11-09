# e-Okul Portalı – Yol Haritası

Son güncelleme: 6 Kasım 2026

Durum işaretleri: ✅ bitti · 🔄 sürüyor · ⏳ bekliyor

Bu belge temel sistemin (giriş, güvenlik, veri, yayına hazırlık) durumunu izler. EduBoard'dan alınacak yeni özellikler (sınıf araçları, quiz, tahta, dosyalar vb.) ayrı listede: [EDUBOARD_IS_LISTESI.md](EDUBOARD_IS_LISTESI.md).

---

## Aşama 1 – Güvenlik temeli 🔄

Amaç: Gerçek öğrenci verisi girilebilecek kadar güvenli bir giriş ve yetki sistemi.

| İş | Durum |
|---|---|
| Admin şifresini kaynak koddan kaldırmak | ✅ |
| Öğretmen/admin girişini Supabase Auth'a taşımak (e-posta + şifre) | ✅ |
| Öğretmen kaydında admin onayı (e-posta onayı kullanıcı isteğiyle kapalı) | ✅ |
| Öğretmen kaydında öğretmenlik belgesi (PDF/JPG/PNG), admin belgeyi görüp onaylar | ✅ |
| Öğrenci girişi: okul + okul no + 4 haneli PIN, sunucuda doğrulama, bcrypt hash, 5 hatada 15 dk kilit | ✅ |
| Öğretmen ve admin öğrenci PIN'ini görebilir (Vault anahtarıyla şifreli; kullanıcı kararı) | ✅ |
| Tek rol: veli rolü ve görünüm geçişi kaldırıldı; her çocuğa tek öğrenci hesabı | ✅ |
| Tüm tablolarda RLS politikaları | ✅ |
| `/yonetim` yalnızca admin oturumunu açar | ✅ |
| Duyurular okula göre ayrıldı; yazar adı sunucuda atanır | ✅ |
| Profilde gerçek şifre değiştirme | ✅ |
| Supabase: anonim giriş (öğrenci girişi için) | ✅ |
| Supabase: sızdırılmış şifre koruması | — (kullanıcı kararıyla yok, 10 Kasım 2026) |
| Admin şifresini değiştirmek | — (kullanıcı kararıyla değiştirilmeyecek, 10 Kasım 2026) |

## Aşama 2 – Gerçek veri modeli ✅

| İş | Durum |
|---|---|
| `teacher_classes`, `homework_checks`, `grades` tabloları; ödevler öğretmene + sınıfa bağlı | ✅ |
| Öğrenci okula bağlı; öğretmen yalnızca kendi okulunun öğrencilerini görür/puanlar (RLS) | ✅ |
| Puan verme sunucuda tek işlemde (`staff_give_points`), öğretmen adı sunucuda | ✅ |
| Ödev kontrolü davranış puanı verir (Yaptı +1, Kısmen 0, Yapmadı −1) | ✅ |
| Mesajlar konuşma bazında: `ogr:<öğrenci>` birebir, `sinif:<okul>:<sınıf>` grup; gönderen adı sunucuda | ✅ |
| Öğrenci numarası okul bazında benzersiz; okul cihazda hatırlanır | ✅ |
| Toplu öğrenci ekleme (liste yapıştır, PIN listesi CSV / yazdır) | ✅ |
| Öğretmen yalnızca kendi sınıflarındaki öğrenciyi ekler, taşır, PIN'ini görür/sıfırlar, siler | ✅ |
| Davranış puanı 0'dan başlar, eksiye düşebilir; sınıf akvaryumu | ✅ |
| Ödeve PDF/resim ekleme (Storage, özel bucket, 10 MB) | ✅ |
| Canlı sohbet: Supabase Realtime (30 sn yedek yenileme); masaüstünde sohbet kutusu | ✅ |
| Toplu mesaj: sınıf grubu sohbetinde "Diğer sınıflara da gönder" (ayrı sayfa yok) | ✅ |
| 81 il ve 973 ilçenin tam listesi | ✅ |
| Öğrencinin ödev teslimi (dosya yükleme) | ⏳ → [EduBoard listesi, Paket 2](EDUBOARD_IS_LISTESI.md#2-ödev-sistemini-güçlendirme-iyileştir) |
| SMS | — (kullanıcı kararıyla yok) |

## Aşama 3 – Çalışırlık ve doğrulama 🔄

| İş | Durum |
|---|---|
| `tsc` ve `eslint` temiz | ✅ (her değişiklikte elle) |
| `npm run build` temiz | ✅ 9 Kasım 2026 (tip kontrolü build'de açık; CI her push'ta) |
| Her rol için uçtan uca akış testi: kayıt → onay → giriş → puan → mesaj → ödev → çıkış | 🔄 Playwright kuruldu; tam zincir test veritabanı bekliyor |
| Hata/boş durum mesajlarının gözden geçirilmesi | ⏳ |
| Supabase güvenlik ve performans uyarılarının (advisors) sıfırlanması | ✅ 9 Kasım 2026 (bilerek bırakılanlar docs/GUVENLIK.md) |

## Aşama 4 – Kod düzeni 🔄

| İş | Durum |
|---|---|
| Öğretmen paneli: kartlı ana sayfa + sol menü + her işe ayrı sayfa | ✅ |
| Süper admin paneli: sol menü + 8 ayrı sayfa (eski tek dosya bölündü) | ✅ |
| Öğrenci paneli: sol menü + gruplu sayfalar (eski tek dosya bölündü) | ✅ |
| Admin ve öğrenci için ortak kabuk (`src/components/shell/PortalShell.tsx`) | ✅ |
| Öğretmen panelini de ortak kabuğa geçirmek | ⏳ |
| Supabase tiplerinin otomatik üretilmesi (`generate_typescript_types`) | ✅ 9 Kasım 2026 (`src/lib/database.types.ts`, `npm run gen:types`) |

## Aşama 5 – Yayına hazırlık ⏳

- Barındırma ve ortam değişkenleri
- Supabase Auth: Site URL / yönlendirme adresleri, Türkçe e-posta şablonları
- Anonim girişe CAPTCHA (kötüye kullanım koruması)
- Yedekleme ve geri yükleme planı

## Aşama 6 – KVKK ✅

Çocuklara ait kişisel veri işlendiği için:
- Aydınlatma metni (`/aydinlatma`, işletmeci tofutr.com, başvuru iletisim@tofutr.com) ve veli açık rızası ✅
- Veli onayı işaretleme: yönetici KVKK sayfası ve öğretmen paneli "Veli onayları" ✅ 10 Kasım 2026
- Veri saklama süresi (30 gün silinenler kutusu), silme / kopya talebi akışı ✅
- Erişim kayıtları (kim hangi öğrencinin verisini gördü/değiştirdi) ✅
- Rızası olmayan öğrencinin girişi engellenmez; takip okulda (şu an sistemde engel yok)

Ayrıntılı iş kalemleri: [EduBoard listesi, Paket 8](EDUBOARD_IS_LISTESI.md#8-güvenlik-ve-kvkk).
