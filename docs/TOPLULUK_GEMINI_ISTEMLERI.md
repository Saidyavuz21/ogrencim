# Topluluk – Gemini istemleri

Sıra: **Ortak kurallar** her istemin başına eklenir. İstemler sırayla verilir: 1 → 2 → 3 → 4.
Her istem bitince Claude kodu kontrol eder; düzeltme gerekirse ayrı istem yazılır.

Veritabanı hazır ve uygulanmış: `supabase/migrations/20261113090000_community_social.sql`.
Arayüzün kullanacağı bütün fonksiyonlar ve tipler: `src/lib/communitySocialData.ts`.
Plan: `docs/TOPLULUK_PLANI.md`.

---

## Ortak kurallar (her istemin başına yapıştır)

```
Proje: tofutr.com okul portalı (Next.js + Supabase, TypeScript, CSS Modules). Çalışma klasörü: F:\Web Site\ogrenci

ÖNCE OKU (zorunlu): AGENTS.md, DESIGN.md, docs/UI_KURALLARI.md, docs/TOPLULUK_PLANI.md, src/lib/communitySocialData.ts.
Next.js kodu yazmadan önce node_modules/next/dist/docs/ içindeki ilgili rehbere bak (kurulu sürüm eğitim verinden farklı olabilir).

KESİN KURALLAR
1. Veritabanına, supabase/ klasörüne ve SQL'e DOKUNMA. Yeni tablo, sütun, RPC, politika YAZMA.
   Bütün veri işlemleri yalnızca src/lib/communitySocialData.ts (yeni sosyal özellikler) ve
   src/lib/communityData.ts (mevcut paylaşım/önizleme/kopyalama/yıldız/favori) üzerinden yapılır.
   Bir fonksiyon eksikse UYDURMA; dosyanın sonuna "EKSİK:" başlıklı not yaz ve o kısmı devre dışı bırak.
2. supabase.from(...) ile topluluk tablolarını doğrudan OKUMA/YAZMA (izinler kapalı; gizlilik süzmesi sunucuda).
3. Gizlilik: sunucunun null ya da hiç göndermediği alanı (okul, il, branş, tanıtım, resim, takipçi sayısı) gösterme,
   başka yerden (profiles tablosu vb.) tamamlamaya çalışma. Ad her zaman author.name'dir.
4. Öğrenciler topluluğu görmez. Öğretmen paneli dışında öğrenci ekranına bağlantı ekleme.
5. Tasarım: DESIGN.md ve docs/UI_KURALLARI.md. Yeşil/sıcak nötr palet, --teacher-* değişkenleri, ince ayırıcılı listeler,
   panel radius 18px (mobil 16px), dokunma alanı en az 44×44 px, mobilde input fontu 16px.
   Tekli seçimde src/components/CustomSelect.tsx (native <select> YOK). İkonlar yalnızca src/components/icons.tsx
   (yoksa oraya aynı tarzda ekle; emoji ikon YOK). Notice/NoticeState, Spinner (src/components/Spinner), useDialog
   (src/components/ConfirmDialog) kullan. Alt sayfa başlığını TeacherPageHeader zaten çiziyor; yeni büyük başlık kartı yapma.
6. Yeni stiller yalnızca src/components/community/ altındaki yeni CSS Module dosyalarında. TeacherDashboard.module.css ve
   ortak bileşenleri genel seçicilerle değiştirme.
7. Her listede yükleniyor / hata / boş durum olsun. Düğmeler istek sırasında disabled; başarı mesajını yalnızca
   gerçek sonuçtan sonra göster. İyimser güncelleme yaparsan hata gelince geri al.
8. Erişilebilirlik: aria-pressed / aria-expanded / aria-current gerçek durumla eşleşsin, görünür odak, ikon düğmelerde aria-label.
9. Metinler Türkçe, kısa, öğretmene hitap eden ("Takip et", "Teşekkürler", "Derste kullandım").
10. Bitince çalıştır: npx tsc --noEmit -p .  ve  npx eslint <değiştirdiğin dosyalar>. Hataları düzelt.
    git commit / push YAPMA. Değiştirdiğin ve eklediğin dosyaların listesini ve yapamadıklarını yaz.
    Tarayıcıda bakmadıysan "görsel kontrol yapılmadı" de.
```

---

## İstem 1 – Profil resmi, topluluk profili ayarları, öğretmen sayfası, takip

```
GÖREV (Aşama 1): Öğretmen topluluk profili.

A) Ortak bileşen: src/components/community/TeacherAvatar.tsx
   - Props: card: TeacherCard (ya da {name, avatar_path}), size: 32 | 40 | 48 | 96, opsiyonel onClick/href.
   - avatar_path varsa avatarUrl(path) ile yuvarlak resim (alt=""; yanında ad zaten yazılıyor), yoksa initialsOfName(name)
     ile yeşil zeminli baş harfler. Resim yüklenemezse baş harflere düş.
   - Ad + "Branş · İl" satırı için ikinci bileşen: TeacherByline (card, opsiyonel tarih). Branş/il null ise yazma.
     card.profile_visible true ise ad tıklanınca öğretmen sayfası açılır (aşağıdaki D maddesindeki onOpenTeacher ile).

B) Profilim sayfasına "Topluluk profilim" bölümü: src/components/teacher/TeacherProfilePage.tsx içine yeni panel
   (mevcut profil/şifre bölümlerini BOZMA). Ayrı bileşen yaz: src/components/community/CommunityProfileSettings.tsx
   - getMySettings() ile yükle. suspended_until doluysa üstte uyarı: "Topluluk hesabınız … tarihine kadar durduruldu."
   - Profil resmi: önizleme (TeacherAvatar 96), "Resim yükle" (uploadAvatar; input accept="image/*"),
     "Resmi kaldır" (removeAvatar, useDialog ile onay). Yükleme sırasında Spinner.
   - Görünen ad: DISPLAY_MODE_LABEL seçenekleri (radyo düğmeleri ya da tekli seçim). 'alias' seçilince takma ad alanı (2–40 karakter).
     Altında canlı önizleme: "Diğer öğretmenler seni şöyle görecek: <ad>" — ad hesaplaması için sunucudaki kural:
     full = tam ad; short = son kelime hariç kelimeler + son kelimenin baş harfi + "." ; alias = takma ad. Kaydedince
     sunucudan dönen preview_name ile güncelle.
   - Tanıtım (bio): textarea, en fazla 200 karakter, sayaç.
   - Anahtarlar (switch/checkbox, etiketli): Profil resmim görünsün, Okulum görünsün, İlim görünsün, Branşım görünsün,
     Beni takip edebilsinler, Takipçi sayılarım görünsün, Paylaşımlarım giriş yapmayanlara önizleme olarak görünsün,
     Takip ettiklerim paylaşınca bildirim al.
     Her anahtarın yanında okul/il/branş için mevcut değeri göster (ör. "Okulum görünsün — Atatürk Ortaokulu").
   - Profilimi kimler görsün: CustomSelect, VISIBILITY_LABEL.
   - "Kaydet" → saveMySettings(EditableSettings). Sunucu kişisel veri bulursa hata metnini Notice ile göster.
   - Kısa açıklama: "Yönetici her zaman bütün bilgilerini görür. Kapattığın bilgiler diğer öğretmenlere ve ziyaretçilere gönderilmez."

C) Topluluk sayfasının içinde gezinme: src/components/community/CommunityPage.tsx şu an arama/ızgara sayfası.
   BU İSTEMDE onu bozma; sadece üst düzey bir kapsayıcı ekle: src/components/community/CommunityHub.tsx
   - Görünümler: 'feed' (şimdilik mevcut CommunityPage'i gösterir), 'teacher' (öğretmen sayfası), 'settings' değil (ayarlar Profilim'de).
   - Adres: mevcut ?sayfa=topluluk korunur; öğretmen sayfası için &ogretmen=<uuid> eklenir (history.pushState; geri tuşu çalışsın;
     sayfa yüklenince URL'den okunur). src/components/teacher/TeacherDashboard.tsx içinde community sayfası
     <CommunityPage /> yerine <CommunityHub /> render etsin. Yönetim panelindeki CommunityPage admin kullanımına DOKUNMA.

D) Öğretmen sayfası: src/components/community/TeacherProfileView.tsx
   - getTeacherProfile(id). null → "Bu profil görüntülenemiyor." boş durumu.
   - profile_visible false → yalnızca avatar + ad + "Bu öğretmen profilini gizlemiş." (takip düğmesi yok).
   - Üst: TeacherAvatar 96, ad, branş · il, okul (geldiyse), tanıtım, sayılar (geldiyse): "48 takipçi · 12 takip",
     "15 paylaşım · 120 kopya · 300 teşekkür".
   - is_self ise "Profilimi düzenle" (Profilim sayfasını açar: TeacherDashboard'daki openPage('profile') — prop ile geçir).
   - can_follow ise "Takip et" / "Takip ediliyor" düğmesi (followTeacher; iyimser güncelle, hata olursa geri al, takipçi sayısını ±1).
     Takip ediliyorsa zil düğmesi: "Her paylaşımında bildir" (followTeacher(id, true, !notify), aria-pressed).
   - "…" menüsü: Sessize al / Engelle / Engeli kaldır (blockTeacher; engelle için useDialog onayı),
     Profili şikâyet et (reportContent('profile', id, neden) – neden için küçük modal, 3–500 karakter).
   - Sekmeler: Paylaşımlar (getFeed({authorId:id, kind:'item'}) → galeri ızgarası: önizleme resmi thumbUrl(item.thumb_path) yoksa
     ders renginde düz yer tutucu + tür ikonu; başlık, ders · sınıf, sayfa/soru sayısı; tıklayınca mevcut CommunityPreview açılır),
     Yazılar (getFeed({authorId:id, kind:'text'}) ve 'link' — şimdilik sade liste: tarih + metin/bağlantı),
     Takipçiler / Takip edilenler (listFollows; sayılar gizliyse sekmeleri gösterme). Sayfalama: "Daha fazla" (before = son created_at; listFollows için offset).
   - Mobil: tek sütun, galeri 2 sütun.

E) Mevcut CommunityPage kartlarındaki yazar adını (author_name) tıklanabilir yap → CommunityHub öğretmen sayfasını açar (author_id).
   (CommunitySummary.author_name sunucuda kayıtlı eski addır; şimdilik böyle kalsın. Yeni akış İstem 2'de gelecek.)
```

---

## İstem 2 – Akış, paylaşım kutusu, galeri, tepkiler, konu takibi, önizleme resmi

```
GÖREV (Aşama 2): Facebook tarzı akış. CommunityHub'daki 'feed' görünümünü yeni akışla değiştir.

A) src/components/community/CommunityFeed.tsx
   - Üstte sekmeler: FEED_TAB_LABEL (Takip ettiklerim / Branşım / Herkes; varsayılan Herkes) ve görünüm seçimi
     "Akış / Galeri" (aria-pressed; seçim localStorage'da try/catch ile hatırlanır).
   - Arama kutusu + "Süz" düğmesi (açılır panel: tür [Hepsi/Yazı/Bağlantı/Tahta/Soru seti], ders, sınıf — CustomSelect;
     SUBJECT_OPTIONS (src/components/files/FileDialogs) ve GRADE_OPTIONS (src/lib/filesData)). Süzgeç doluysa "Temizle".
   - Veri: getFeed({tab, kind, subject, grade, query, before, limit:20}). Sonsuz kaydırma yerine "Daha fazla göster" düğmesi
     (before = son gönderinin created_at). Arama 350 ms gecikmeli.
   - "Takip ettiklerim" boşsa: "Henüz kimseyi takip etmiyorsun" + getSuggestions() kartları (TeacherAvatar, ad, branş · il, Takip et).
   - Galeri görünümünde yalnızca kind='item' gönderiler (getFeed kind 'item'), ızgara: masaüstü 3–4, mobil 2 sütun.
   - Sağ kenar (masaüstü ≥1024): "Takip önerileri" (getSuggestions(5)) ve "Takip ettiğin konular" (listMyTopics +
     followTopic ile ekle/çıkar: ders + sınıf seçimi). Mobilde bunlar akışın üstünde katlanabilir bölüm.

B) Paylaşım kutusu: src/components/community/PostComposer.tsx (akışın en üstünde)
   - "Bir şey yaz…" textarea (2000 karakter, sayaç). Ders seçimi (varsayılan boş = sunucu öğretmenin branşını yazar).
   - "Bağlantı ekle": adres (https://…) + başlık (isteğe bağlı) → kind 'link'. Fotoğraf/dosya yükleme YOK; bunu küçük not olarak yaz:
     "Fotoğraf ve dosya paylaşılamaz; Drive ya da YouTube bağlantısı ekleyebilirsin."
   - "Tahta paylaş" / "Soru seti paylaş": mevcut paylaşım akışına yönlendirir (Tahtalarım ve Soru bankası sayfalarındaki
     "Toplulukta paylaş"; TeacherDashboard openPage('boards') / openPage('questions') — prop ile geçir).
   - createPost(...). Başarılıysa kutuyu temizle ve getPost(id) ile dönen gönderiyi akışın başına ekle.
   - Sunucu hatası (kişisel veri, sıklık sınırı, uzaklaştırma) Notice ile gösterilir.

C) Gönderi kartı: src/components/community/PostCard.tsx
   - Üst: TeacherAvatar 40 + TeacherByline (ad, branş · il, göreli tarih "3 saat önce", düzenlendiyse "düzenlendi").
   - kind 'text': metin (satır sonları korunur, uzun metinde "Devamını göster").
   - kind 'link': metin + bağlantı kutusu (link_title, alan adı; target=_blank rel="noopener noreferrer nofollow ugc").
   - kind 'item': açıklama + içerik kutusu: önizleme resmi (thumbUrl) ya da yer tutucu, başlık, Tahta/Soru seti, ders · sınıf,
     sayfa/soru sayısı, kopya sayısı, ⭐ ortalama; "Önizle" (mevcut CommunityPreview), "Kopyala" (mevcut copyFromCommunity
     akışını CommunityPage'den taşı/yeniden kullan), "Kaydet" (favoriteCommunity).
   - Alt çubuk: "Teşekkürler (n)" ve "Derste kullandım (n)" (react; aria-pressed; kendi gönderisinde devre dışı),
     "Yorumlar (n)" (İstem 3'te açılacak; şimdilik sadece sayı).
   - "…" menüsü: kendi yazı/bağlantısıysa Düzenle (updatePost) / Sil (deletePost, onaylı); kendi içerik gönderisiyse
     "Paylaşımdan kaldır" (mevcut unpublishCommunity, onaylı); başkasınınsa Şikâyet et (reportContent('post', id, neden)),
     Yazarı sessize al (blockTeacher(author.id,'mute')).
   - Yazar adı/resmi tıklanınca öğretmen sayfası (author.profile_visible ise).

D) Önizleme resmi (tahta): paylaşım tamamlanınca (src/components/community/PublishDialog.tsx onPublished(itemId))
   tahtanın İLK sayfasını küçük resme çevirip uploadItemThumb(itemId, blob) ile yükle.
   - Tahtayı çizen mevcut bileşeni (src/components/board/ altında; CommunityPreview tahtayı nasıl çiziyorsa) gizli bir
     kapta salt-okunur render et; src/lib/boardData.ts içindeki exportBoardPng'nin renderToBlob mantığını DIŞA AKTARILAN
     yeni bir fonksiyona ayır (ör. renderBoardSvgToBlob(svg, {width: 640, type: 'image/webp', quality: 0.75})).
     exportBoardPng aynı davranışı korumalı (indirilen PNG değişmesin).
   - 200 KB'ı geçerse kaliteyi düşürüp yeniden dene; yine olmazsa önizlemesiz bırak (hata gösterme, sessizce geç).
   - Soru setlerinde önizleme resmi yok (kartta tür ikonu + soru sayısı).

E) Mevcut arama sayfasının özellikleri kaybolmasın: Editörün seçimi, Favorilerim, Paylaştıklarım. Bunları akışta süzgeç ya da
   ayrı küçük sekmeler olarak sun (searchCommunity scope 'featured' | 'favorites' | 'mine' galeri görünümünde kullanılabilir).
   Yönetim panelindeki CommunityPage admin modu aynen kalsın.
```

---

## İstem 3 – Yorumlar, bildirimler, şikâyet ve yönetici denetimi

```
GÖREV (Aşama 3).

A) Yorumlar: PostCard'da "Yorumlar (n)" tıklanınca kartın altında açılır bölüm.
   - listComments(postId) (ilk 50; daha fazlası için "Önceki yorumlar" offset), her yorum: TeacherAvatar 32, ad, göreli tarih, metin.
   - Yorum yaz: textarea (1000 karakter), Enter = satır, "Gönder" düğmesi; addComment → dönen yorumu listeye ekle, sayacı +1.
   - can_delete ise "Sil" (deleteComment, onaylı). Başkasının yorumunda "Şikâyet et" (reportContent('comment', id, neden)).
   - Sunucu hatası (kişisel veri, sıklık sınırı) Notice ile.

B) Bildirimler: src/components/community/CommunityNotifications.tsx
   - Öğretmen üst çubuğundaki "Topluluk" düğmesinde okunmamış sayısı rozeti: countUnreadNotifications()
     (src/components/teacher/TeacherTopBar.tsx ve TeacherDashboard.tsx; mevcut Mesajlar rozetinin stilini kullan; 60 sn'de bir yenile,
     sekme görünür değilken yenileme yapma). Mobil çekmecedeki Topluluk bağlantısında da aynı sayı.
   - Topluluk sayfasının üstünde "Bildirimler" düğmesi → açılır panel/sayfa: listNotifications(30), satır metni notificationText(n),
     TeacherAvatar (actor varsa), göreli zaman, okunmamışlar vurgulu. Panel açılınca markNotificationsRead().
   - Satıra tıklama: post_id varsa getPost(post_id) ile o gönderiyi tek başına göster (gönderi görünümü + yorumlar);
     kind 'follow' ise öğretmen sayfası; 'moderation' yalnızca metin.
   - "Daha fazla" (before = son satırın at değeri).

C) Yönetici denetimi (yalnızca süper admin): src/components/admin/AdminCommunityReportsPage.tsx
   - src/components/admin/adminPages.ts'e yeni sayfa: { id: 'community_reports', slug: 'topluluk-sikayetleri', title: 'Topluluk şikâyetleri',
     description: 'Şikâyet edilen gönderi, yorum ve profiller', icon: Flag, group: 'İçerik' } ve AdminDashboard'da bağla
     (mevcut admin sayfa deseni; AdminManagement.module.css ve adminShared bileşenleri).
   - listReports(status) — sekmeler: Açık / Kaldırılan / Reddedilen. Her satır: tür, tarih, şikâyet nedeni, şikâyet eden (gerçek ad, okul),
     içerik sahibi (gerçek ad, okul, e-posta), içeriğin kopyası (snapshot: body / link_url / link_title / bio / alias alanlarını
     okunur biçimde göster; ham JSON'u katlanabilir "Ayrıntı" içinde), aynı içerik için şikâyet sayısı, yazar uzaklaştırılmışsa bitiş tarihi.
   - İşlemler: "İçeriği kaldır" ve "Reddet" (resolveReport; not alanı), kaldırırken isteğe bağlı "Yazarı topluluktan uzaklaştır:
     yok / 3 / 7 / 30 gün" (CustomSelect). Uzaklaştırılmışsa "Uzaklaştırmayı kaldır" (unsuspendTeacher). Hepsi useDialog onaylı.
   - Not: kayıtlar silinmez (5651 sayılı kanun); sayfada kısa açıklama olarak yaz.
```

---

## İstem 4 – Herkese açık topluluk sayfası

```
GÖREV (Aşama 4): Giriş gerektirmeyen önizleme sayfası.

A) Yeni yol: src/app/topluluk/page.tsx (+ gerekirse src/app/topluluk/layout.tsx). Next.js sürümünün App Router kurallarına uy
   (node_modules/next/dist/docs). Sayfa başlığı ve açıklaması (metadata): "Öğretmen Topluluğu · tofutr.com".
   - Ana sayfanın (src/components/home/HomePage.tsx) üst kısmı ve renkleriyle uyumlu sade bir üst çubuk: logo (ana sayfaya),
     "Giriş yap" ve "Ücretsiz kayıt ol" (/giris ve /giris#kayit).
   - Veri yalnızca: getPublicGallery, getPublicItem, getPublicFacets, getTeacherProfile. BAŞKA veri çağrısı yok
     (ziyaretçide oturum yok; communityData.ts fonksiyonları ziyaretçide çalışmaz).
   - Galeri ızgarası (masaüstü 4, tablet 3, mobil 2 sütun): önizleme resmi (thumbUrl; yoksa ders renginde yer tutucu + tür ikonu),
     başlık, ders · sınıf, sayfa ya da soru sayısı, yazar (TeacherAvatar 32 + ad), kopya ve teşekkür sayısı, Editörün seçimi rozeti.
   - Üstte: arama, tür (Hepsi/Tahta/Soru seti), ders ve sınıf (getPublicFacets'teki değerler; CustomSelect), sıralama
     (Popüler / En yeni / En yüksek puan). "Daha fazla göster" (offset).
   - Kart tıklanınca önizleme penceresi (Modal): büyük önizleme resmi, başlık, açıklama, ders/sınıf, sayılar, soru setinde
     first_question metni ("İlk soru: …"), yazar. İçerik, şık, cevap YOK. Büyük düğme: "Kullanmak için giriş yap" →
     /giris?sayfa=topluluk . Kayıt olmayanlar için "Ücretsiz kayıt ol".
   - Beğenme/yorum/takip/kopyalama gibi her işlem düğmesi aynı giriş yönlendirmesine gider.
   - Yazar adına tıklama: getTeacherProfile(id) null değilse küçük profil kartı (ad, resim, branş · il, tanıtım varsa) +
     o yazarın herkese açık içerikleri (getPublicGallery({authorId})). null ise tıklanamaz.
   - Boş durum: "Henüz herkese açık paylaşım yok. Öğretmenlerin paylaştıkları içerikler burada görünecek."
     + giriş/kayıt düğmeleri.
   - Yazılar ve yorumlar bu sayfada GÖRÜNMEZ (yalnızca giriş yapmış öğretmenler).

B) Ana sayfadaki Topluluk bağlantısı (src/components/home/HomePage.tsx, communityLink) artık /topluluk'a gitsin.
   Giriş yapmış öğretmen /topluluk'u açarsa üstte "Topluluğa git" düğmesi göster (/giris?sayfa=topluluk) —
   oturum kontrolü için mevcut restoreSession (src/lib/supabaseClient.ts) yalnızca bu düğme için kullanılabilir.

C) Erişilebilirlik ve SEO: kartlar <a>/<button> olsun, resimlerde alt=başlık, sayfa sunucuda en azından iskeletiyle render
   edilsin ya da istemci bileşeni ise yükleniyor durumu olsun. Robots/sitemap'e dokunma.
```
