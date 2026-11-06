# e-Okul Portalı

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Öğretmen, öğrenci, veli ve okul yöneticisi. Kullanıcı 3 Kasım 2026 tarihinde tasarımın ilk uygulama alanı olarak öğretmen panelini seçti.

## Operating Context

Kullanıcının belirttiği ana kullanım ortamı telefon ekranıdır. Tasarım önce mobilde çözülür; masaüstü bu yapının genişlemesidir. Ekranlar ferah, kolay okunur ve rahat dokunulur olmalı; içerik tek ekrana sığdırılmak için sıkıştırılmamalıdır.

## Product Purpose

Ödev, öğrenci gelişimi, not ve okul–aile iletişimini aynı portalda takip etmek. Bu kapsam mevcut koddan okunmuştur; bütün işlevlerin canlı ve tamamlanmış olduğu anlamına gelmez.

## Capabilities and Constraints

- Mevcut teknoloji: Next.js, React, TypeScript ve Supabase. Arayüz Türkçe.
- Öğretmen panelinde ödev kontrolü, artı/eksi puan, ödev oluşturma, teslim değerlendirme, sınıf yönetimi, not girişi, öğrenci mesajları (sınıf grubu mesajı birden çok sınıfa gönderilebilir) ve sıralama bulunuyor.
- Tasarım geliştirmesinde giriş, yetki ve rol sınırları korunmalı.
- docs/YOL_HARITASI.md birçok ekranda yerel/örnek veri kullanımının sürdüğünü kaydediyor. Kaydedildi veya iletildi bildirimi gerçek işlem sonucu doğrulanmadan verilmemeli.

## Brand Commitments

Kullanıcının seçimi: daha sıcak ve öğrenci odaklı kimlik. İlk örnek: öğretmen paneli. Kullanıcının sonraki isteğiyle ilk uygulama giriş ve öğretmen kaydı ekranına taşındı. Bu ekranın uygulanan palet ve bileşen kuralları DESIGN.md içinde kayıtlıdır; genel öneri docs/TASARIM_DILI.md içinde korunur. Görsel doğrulama henüz tamamlanmadı.

## Evidence on Hand

AuthPage.tsx, TeacherDashboard.tsx, StudentDashboard.tsx, AdminDashboard.tsx, Navbar.tsx, BottomNav.tsx, globals.css, layout.tsx ve docs/YOL_HARITASI.md incelendi.

## Product Principles

- Öğrencinin gelişimini destekleyici ve anlaşılır ifade et.
- Öğretmenin sık işlemlerini doğrudan erişilebilir tut.
- Aynı işlemi bütün rollerde aynı terim ve davranışla sun.
- Örnek veri ile gerçek veriyi, taslak ile kaydedilmiş durumu ayır.


