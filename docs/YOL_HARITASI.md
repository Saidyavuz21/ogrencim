# e-Okul Portalı – Yol Haritası

Son güncelleme: 3 Kasım 2026

Durum işaretleri: ✅ bitti · 🔄 sürüyor · ⏳ bekliyor

---

## Aşama 1 – Güvenlik temeli 🔄

Amaç: Gerçek öğrenci/veli verisi girilebilecek kadar güvenli bir giriş ve yetki sistemi.

| İş | Durum |
|---|---|
| Admin şifresini kaynak koddan kaldırmak | ✅ |
| Öğretmen/Admin girişini Supabase Auth'a taşımak (e-posta + şifre) | ✅ |
| Öğretmen kaydında admin onayı (e-posta onayı kullanıcı isteğiyle kapalı) | ✅ |
| Öğrenci/Veli girişi: okul no + 4 haneli PIN, sunucuda doğrulama, bcrypt hash, 5 hatada 15 dk kilit | ✅ (kod) |
| Veli kilit ekranının PIN'i ekranda göstermesini kaldırmak | ✅ |
| Herkesin menüden Admin'e geçebildiği rol değiştiriciyi kısıtlamak | ✅ |
| Tüm tablolarda RLS politikaları | ✅ (veritabanına uygulandı) |
| Admin paneline hesap yönetimi: öğretmen onay/red, düzenleme, pasif/aktif, silme; öğrenci ekleme, PIN sıfırlama | ✅ |
| Profilde gerçek şifre değiştirme | ✅ |
| Supabase: Anonim girişi açmak (öğrenci girişi için gerekli) | ✅ |
| Supabase: Sızdırılmış şifre korumasını açmak | ⏳ panelden |
| Admin şifresini değiştirmek (eski şifre git geçmişinde açık) | ⏳ kullanıcı |

## Aşama 2 – Gerçek veri modeli 🔄

4 Kasım 2026: Bütün paneller (öğretmen, öğrenci, veli, süper admin) veritabanına bağlandı; örnek veri kaldırıldı. Migration: `supabase/migrations/20261104120000_teacher_real_data.sql`.

| İş | Durum |
|---|---|
| `teacher_classes`, `homework_checks`, `grades` tabloları; ödevler öğretmene + sınıfa bağlı | ✅ |
| Öğrenci okula bağlı; öğretmen yalnızca kendi okulunun öğrencilerini görür/puanlar (RLS) | ✅ |
| Puan verme sunucuda tek işlemde (`staff_give_points`), öğretmen adı sunucuda | ✅ |
| Mesajlar konuşma bazında: `ogr:<öğrenci>` birebir, `sinif:<okul>:<sınıf>` grup; gönderen adı sunucuda | ✅ |
| Öğretmen paneli: kartlı ana sayfa + ayrı sayfalar, hepsi veritabanından | ✅ |
| Öğrenci/veli paneli ve süper admin paneli veritabanından | ✅ |
| Öğrenci numarası okul bazında benzersiz; giriş okul + numara + PIN (okul cihazda hatırlanır) | ✅ |
| Toplu öğrenci ekleme (liste yapıştır, PIN listesi CSV / yazdır) | ✅ |
| Öğretmen yalnızca kendi sınıflarındaki öğrenciyi ekler, taşır, PIN sıfırlar, siler (veli mesajlarıyla birlikte) | ✅ |
| Davranış puanı 0'dan başlar, eksiye düşebilir | ✅ |
| Öğrenci → öğretmen mesajlaşması (soru:<öğrenci>, veli yazışmasından ayrı) | ✅ |
| Ödeve PDF/resim ekleme (Storage, özel bucket, 10 MB) | ✅ |
| Öğrencinin ödev teslimi (dosya yükleme) | ⏳ |
| Canlı sohbet: Supabase Realtime (30 sn yedek yenileme) | ✅ |
| SMS: yok; toplu mesaj uygulama içi sınıf grubuna gider (kullanıcı kararı) | — |

## Aşama 3 – Çalışırlık ve doğrulama ⏳

- `npm run build` ve `npm run lint` temiz
- Her rol için uçtan uca akış testi: kayıt → onay → giriş → puan verme → mesaj → ödev → çıkış
- Hata/boş durum mesajlarının gözden geçirilmesi
- Supabase güvenlik ve performans uyarılarının (advisors) sıfırlanması

## Aşama 4 – Kod düzeni ⏳

- `TeacherDashboard.tsx` (3.200+ satır), `AdminDashboard.tsx`, `ParentTeacherChat.tsx`, `page.tsx` parçalara bölünür
- Veri erişimi tek katmanda (hooks) toplanır
- Supabase tipleri otomatik üretilir (`generate_typescript_types`)

## Aşama 5 – Yayına hazırlık ⏳

- Barındırma ve ortam değişkenleri
- Supabase Auth: Site URL / yönlendirme adresleri, Türkçe e-posta şablonları
- Anonim girişe CAPTCHA (kötüye kullanım koruması)
- Yedekleme ve geri yükleme planı

## Aşama 6 – KVKK ⏳

Çocuklara ait kişisel veri işlendiği için:
- Aydınlatma metni ve veli açık rızası
- Veri saklama süresi, silme talebi akışı
- Erişim kayıtları (kim hangi öğrencinin verisini gördü/değiştirdi)
