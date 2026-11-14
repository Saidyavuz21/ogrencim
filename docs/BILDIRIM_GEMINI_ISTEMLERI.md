# Bildirimler – Gemini istemleri (Aşama 1: zil ve okunmamış sayısı)

Sıra: **Ortak kurallar** her istemin başına eklenir. İstemler sırayla verilir: 1 → 2 → 3 → 4.
Her istem bitince Claude kodu kontrol eder; düzeltme gerekirse ayrı istem yazılır.

Veritabanı hazır ve canlıya uygulanmış: `supabase/migrations/20261117090000_notifications.sql`.
Arayüzün kullanacağı bütün fonksiyonlar ve tipler: `src/lib/notificationData.ts`.
Plan: `docs/BILDIRIM_PLANI.md`.

---

## Ortak kurallar (her istemin başına yapıştır)

```
Proje: tofutr.com okul portalı (Next.js + Supabase, TypeScript, CSS Modules). Çalışma klasörü: F:\Web Site\ogrenci

ÖNCE OKU (zorunlu): AGENTS.md, DESIGN.md, docs/UI_KURALLARI.md, docs/BILDIRIM_PLANI.md, src/lib/notificationData.ts.
Next.js kodu yazmadan önce node_modules/next/dist/docs/ içindeki ilgili rehbere bak (kurulu sürüm eğitim verinden farklı olabilir).

KESİN KURALLAR
1. Veritabanına, supabase/ klasörüne ve SQL'e DOKUNMA. Yeni tablo, sütun, RPC, politika YAZMA.
   Bildirim verisi yalnızca src/lib/notificationData.ts üzerinden okunur ve okundu yapılır
   (useUnreadNotifications, listNotifications, markNotificationsRead, markNotificationGroupsRead,
   notificationGroups, notificationText, notificationTarget, getNotificationSettings, saveNotificationSettings,
   TEACHER_NOTIFICATION_KINDS, STUDENT_NOTIFICATION_KINDS).
   supabase.from('notifications') ile doğrudan okuma/yazma YAPMA. Bir fonksiyon eksikse UYDURMA;
   değiştirdiğin dosyanın sonuna "EKSİK:" başlıklı not yaz ve o kısmı devre dışı bırak.
2. src/lib/notificationData.ts dosyasını DEĞİŞTİRME (yalnızca içe aktar).
3. Bildirim metnini kendin kurma: ana cümle her zaman notificationText(n); ikinci satır n.title (ve varsa n.body).
   Tıklanınca gidilecek yer her zaman notificationTarget(n, rol).
4. Mevcut işlevleri bozma: mesaj okundu bilgisi, topluluk sayfasının kendi bildirim listesi (CommunityNotifications),
   duyurular sayfası, öğrenci "Uygulamayı yükle" kartı (InstallAppBanner) olduğu gibi kalır.
5. Tasarım: DESIGN.md ve docs/UI_KURALLARI.md. Yeşil/sıcak nötr palet, --teacher-* değişkenleri, ince ayırıcılı listeler,
   panel radius 18px (mobil 16px), dokunma alanı en az 44×44 px, mobilde input fontu 16px.
   İkonlar yalnızca src/components/icons.tsx (yoksa oraya aynı tarzda ekle; emoji ikon YOK).
   Notice, Spinner (src/components/Spinner), useDialog (src/components/ConfirmDialog) kullan.
   Masaüstü ve mobil görünümü ayrı ayrı düşün; birine yönelik değişikliği ötekine taşırma.
6. Yeni stiller yalnızca src/components/notifications/ altındaki yeni CSS Module dosyalarında.
   TeacherDashboard.module.css, PortalShell ve ortak bileşenleri genel seçicilerle değiştirme.
7. Her listede yükleniyor / hata / boş durum olsun. Düğmeler istek sırasında disabled; başarıyı yalnızca gerçek sonuçtan sonra göster.
   İyimser güncelleme yaparsan hata gelince geri al.
8. Erişilebilirlik: zil düğmesinde aria-label okunmamış sayısını söyler ("Bildirimler, 3 okunmamış"),
   aria-expanded panelin açık olup olmadığıyla eşleşir; panel Esc ile kapanır, kapanınca odak zile döner; görünür odak.
9. Metinler Türkçe ve kısa. Öğretmene "siz", öğrenciye "sen" diye hitap edilir (notificationText bunu zaten yapar).
10. Bitince çalıştır: npx tsc --noEmit -p .  ve  npx eslint <değiştirdiğin dosyalar>. Hataları düzelt.
11. Yapmadığın görsel kontrolü yapılmış gibi yazma. Bitince değiştirdiğin dosyaları ve neyi denediğini kısaca listele.
```

---

## İstem 1 – Bildirim paneli bileşeni

```
GÖREV: Öğretmen ve öğrencinin ortak kullanacağı bildirim paneli bileşenini yaz. Bu istemde panel hiçbir yere BAĞLANMAZ
(bağlama İstem 2'de); yalnızca bileşen ve stili.

Dosyalar:
- src/components/notifications/NotificationPanel.tsx
- src/components/notifications/Notifications.module.css

Bileşen:
  export function NotificationPanel(props: {
    role: 'teacher' | 'student';
    open: boolean;
    onClose: () => void;
    /** Bildirime tıklanınca: panel kapanır, sonra bu çağrılır */
    onOpenTarget: (target: NotificationTarget, n: AppNotification) => void;
    /** Zil düğmesi (kapanınca odak buraya döner; masaüstünde panel bunun altına hizalanır) */
    anchorRef: React.RefObject<HTMLElement | null>;
  })

Davranış:
- open true olunca listNotifications() ile ilk 30 kayıt yüklenir; "Daha fazla" düğmesi son öğenin at değeriyle sonraki sayfayı getirir
  (dönen kayıt 30'dan azsa düğme gizlenir).
- Satır: solda türe göre ikon (mesaj → MessageSquare, ödev → FileText/CheckSquare, canlı ders → uygun ikon, duyuru → Bell,
  topluluk → Globe; icons.tsx'te olanları kullan), ortada notificationText(n) (kalın değil, okunmamışsa yarı kalın),
  altında n.title (tek satır, taşarsa …) ve varsa n.body (soluk, tek satır), sağda göreli zaman
  ("Az önce", "5 dk önce", "3 sa önce", "2 gün önce", daha eskiyse "12 Kas"). Okunmamış satırda küçük yeşil nokta.
  Duyuru n.sub === 'urgent' ise küçük "Önemli" etiketi.
- Satıra tıklayınca: okunmamışsa markNotificationsRead([n.id]) (sonucu beklemeden gezinmeye devam et, hata sessiz),
  panel kapanır, onOpenTarget(notificationTarget(n, role), n) çağrılır. Satırlar <button> (klavyeyle erişilebilir).
- Başlık satırı: "Bildirimler" + sağda "Tümünü okundu yap" (okunmamış yoksa disabled) + kapat (X) düğmesi.
  "Tümünü okundu yap" → markNotificationsRead() → başarılıysa listede hepsi okunmuş görünür.
- Boş durum: "Henüz bildirim yok." + kısa açıklama (öğretmen: "Mesaj, ödev teslimi ve duyurular burada görünür.",
  öğrenci: "Ödev, mesaj ve duyurular burada görünür.").
- Hata durumu: Notice + "Tekrar dene".

Görünüm:
- Masaüstü (> 760px): zilin altında açılan panel (popover), genişlik ~380px, en fazla ~70vh yükseklik, içi kayar;
  dışına tıklayınca ve Esc ile kapanır. Gölge ve radius DESIGN.md'deki panel kurallarıyla.
- Mobil (≤ 760px): tam ekran sayfa (üstte başlık + geri/kapat), alttaki liste kayar; arka plan kaymaz.
  Dokunma alanları en az 44px.
- Sayfanın geri kalanı değişmez.
```

---

## İstem 2 – Zilleri panele bağla (öğretmen + öğrenci)

```
GÖREV: Öğretmen ve öğrenci üst çubuğundaki mevcut zil düğmesini yeni bildirim paneline bağla.
İstem 1'deki src/components/notifications/NotificationPanel.tsx hazır.

ÖĞRETMEN
- src/components/teacher/TeacherDashboard.tsx: useUnreadNotifications(true) ile okunmamış sayısını al ve TeacherTopBar'ın
  unreadCount prop'una ver (şu an dışarıdan gelen unreadCount prop'u kullanılıyor; onun yerine bu sayı).
- TeacherTopBar'daki zil şu an duyurular sayfasını açıyor (onNotifications). Bunu değiştir: zil NotificationPanel'i açıp kapatır
  (aria-expanded). Zil düğmesine ref ver (anchorRef). TeacherTopBar'a gerekiyorsa bellRef / notificationsOpen prop'u ekle.
- onOpenTarget: target.page'e openPage ile git. target.page === 'messages' ve target.refId doluysa o sohbet açılmalı:
  TeacherMessagesPage'e isteğe bağlı initialConversationId prop'u ekle; verilince o sohbet seçili açılır
  (sohbet listesinde yoksa normal açılış). target.page === 'community' ise topluluk sayfası açılır (gönderi açmak bu aşamada yok).
- PortalApp.tsx'teki onOpenNotifications → duyurular davranışını kaldır ya da etkisiz bırak (duyurular menüden açılmaya devam eder).
- Mobil menü / sol menü rozetleri (badges) değişmez. Topluluk sayfasındaki ayrı bildirim listesi değişmez.

ÖĞRENCİ
- src/components/student/StudentPortal.tsx: PortalTopBar'ın bell prop'u şu an duyuruları açıyor ve yeni duyuru sayısını gösteriyor.
  Bunu değiştir: sayı useUnreadNotifications(true).count, label 'Bildirimler', tıklayınca NotificationPanel açılır/kapanır.
  PortalTopBar'a zil düğmesi için ref ve aria-expanded geçirebilmek üzere en küçük değişikliği yap
  (ör. bell: { …, ref, expanded }); admin paneli de PortalTopBar kullanıyorsa onun davranışı bozulmasın.
- onOpenTarget: openPage(target.page). target.page === 'mesajlar' ve refId doluysa StudentMessagesPage o sohbeti açsın
  (isteğe bağlı initialConversationId prop'u; refId 'ogr:…' ise birebir, 'sinif:…' ise o grup).
- Sol menüdeki duyurular rozeti (newAnnouncements) ve diğer rozetler değişmez.

İKİSİ İÇİN
- Panel açıkken sayfa değişirse panel kapanır.
- Bildirime tıklayıp aynı sayfadaysan da doğru kayda gidilir (sohbet değişir).
```

---

## İstem 3 – Bildirim ayarları

```
GÖREV: Öğretmen profil sayfasına ve öğrenci "Hesabım" sayfasına "Bildirimler" bölümü ekle.

Dosyalar:
- src/components/notifications/NotificationSettingsSection.tsx (ortak bileşen, role prop'u alır)
- Öğretmen: src/components/teacher/TeacherProfilePage.tsx içine bölüm olarak
- Öğrenci: "hesap" sayfasının içeriği neredeyse (StudentPortal.tsx / StudentSections.tsx) oraya bölüm olarak

İçerik:
- getNotificationSettings() ile yükle. Liste: öğretmende TEACHER_NOTIFICATION_KINDS, öğrencide STUDENT_NOTIFICATION_KINDS.
  Her satır: label, altında description, sağda aç/kapa anahtarı (switch, role="switch", aria-checked).
  Anahtar açık = tür off_in_app içinde DEĞİL. Değiştirince saveNotificationSettings({ off_in_app, off_push }) çağrılır
  (off_push'u olduğu gibi geri gönder; bu aşamada ekranda gösterme). İstek sürerken o anahtar disabled; hata olursa eski hâline dön ve Notice göster.
- Öğretmende (can_edit_quiet true) ek satır: "Sessiz saatler" anahtarı + başlangıç ve bitiş saati
  (<input type="time">, mobilde 16px font). Kaydet düğmesiyle saveNotificationSettings({ off_in_app, off_push, quiet_enabled, quiet_start, quiet_end }).
  Altında kısa not: "Telefon bildirimleri bu saatlerde gönderilmez; bildirimler zilde bekler."
- Öğrencide sessiz saat satırı yok; yalnızca küçük bilgi: "Gece 22.00 ile 07.00 arasında telefona bildirim gönderilmez."
- Bölümün üstünde tek cümle: "Kapattığın bildirimler zilde görünmez." (öğretmende "Kapattığınız…").
- Telefon bildirimi (push) düğmesi bu aşamada YOK.
```

---

## İstem 4 – Sayfa açılınca ilgili bildirim okunsun

```
GÖREV: Kullanıcı ilgili kaydı ekranda açtığında, o kayda ait zil bildirimi kendiliğinden okundu olsun.
Yalnızca markNotificationGroupsRead(notificationGroups.<...>(id)) çağrısı eklenir; başka davranış değişmez.
Mesaj sayfaları zaten bağlı (TeacherMessagesPage, StudentMessagesPage) — onlara dokunma.

- Öğrenci ödev detayını / ödev kartını açınca (ödevin içeriğinin gösterildiği an; liste görünümü yetmez):
  markNotificationGroupsRead(notificationGroups.homework(homework.id))
  Öğrenci "Ödevler" sayfasını açınca, ekranda listelenen ödevlerden sonucu görünenler için de aynı çağrı yapılabilir
  (tek çağrıda en fazla 50 grup; notificationGroups.homework iki grup döner).
- Öğretmen bir ödevin teslimlerini / kontrol ekranını açınca (TeacherCheckPage ya da teslimlerin listelendiği yer):
  markNotificationGroupsRead(notificationGroups.submissions(homework.id))
- Öğrenci canlı derse katılınca (LiveStudentSession açılınca): markNotificationGroupsRead(notificationGroups.live(sessionId))
- Duyurular sayfası açılınca (öğretmen ve öğrenci; AnnouncementsPage ya da öğrencinin duyurular bölümü):
  ekranda listelenen duyurular için markNotificationGroupsRead(listedAnnouncements.flatMap(a => notificationGroups.announcement(a.id)))
  (en fazla 50).
- Bu çağrılar sessizdir: hata gösterilmez, yükleme göstergesi yoktur, sayfanın geri kalanını beklemez.
- Aynı kayıt için tekrar tekrar çağırma (useEffect bağımlılıklarını kayıt kimliğine göre kur).
```
