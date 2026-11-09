# e-Okul Portalı

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Öğretmen, öğrenci, veli ve okul yöneticisi. Kullanıcı 3 Kasım 2026 tarihinde tasarımın ilk uygulama alanı olarak öğretmen panelini seçti.

## Operating Context

Telefon ve masaüstü web birlikte desteklenir. 8–9 Kasım 2026 çalışmasında kullanıcı aynı görsel dilin farklı yerleşimlerle kullanılmasını seçti; tek görünüm istendiğinde diğeri korunur. Ekranlar ferah, okunaklı ve rahat dokunulur olmalı; içerik tek ekrana sığdırılmak için sıkıştırılmamalıdır. Ayrı bir native mobil uygulama bu çalışmanın teslimi değildir.

## Product Purpose

Ödev, öğrenci gelişimi, not ve okul–aile iletişimini aynı portalda takip etmek. Bu kapsam mevcut koddan okunmuştur; bütün işlevlerin canlı ve tamamlanmış olduğu anlamına gelmez.

## Capabilities and Constraints

- Mevcut teknoloji: Next.js, React, TypeScript ve Supabase. Arayüz Türkçe.
- Öğretmen panelinde ödev kontrolü, artı/eksi puan, ödev oluşturma, teslim değerlendirme, sınıf yönetimi, not girişi, öğrenci mesajları (sınıf grubu mesajı birden çok sınıfa gönderilebilir) ve sıralama bulunuyor.
- Tasarım geliştirmesinde giriş, yetki ve rol sınırları korunmalı.
- docs/YOL_HARITASI.md birçok ekranda yerel/örnek veri kullanımının sürdüğünü kaydediyor. Kaydedildi veya iletildi bildirimi gerçek işlem sonucu doğrulanmadan verilmemeli.

## Brand Commitments

Kullanıcının seçimi sıcak ve öğrenci odaklı kimliktir. Güncel öğretmen panelinde yeşil ve sıcak nötr palet korunur; baskın mavi yönü reddedildi. Ortak header, daraltılabilir sidebar, mobil alt menü ve kompakt içerik desenleri DESIGN.md ve docs/UI_KURALLARI.md içindedir. Giriş/kayıt ekranının kendi ölçüleri korunur. docs/TASARIM_DILI.md tarihsel öneri olarak saklanır. Bütün sayfa/boyutlarda görsel doğrulama henüz tamamlanmadı.

## Evidence on Hand

AuthPage.tsx, TeacherDashboard.tsx, StudentDashboard.tsx, AdminDashboard.tsx, Navbar.tsx, BottomNav.tsx, globals.css, layout.tsx ve docs/YOL_HARITASI.md incelendi.

## Product Principles

- Öğrencinin gelişimini destekleyici ve anlaşılır ifade et.
- Öğretmenin sık işlemlerini doğrudan erişilebilir tut.
- Aynı işlemi bütün rollerde aynı terim ve davranışla sun.
- Örnek veri ile gerçek veriyi, taslak ile kaydedilmiş durumu ayır.


