# BÖLÜM 1: YOL HARİTASI (FAZ 1 → FAZ 4)

## 🏗️ Genel Mimari İlkeler (Sabitlenmiş Sürüm Standartları)
- **Backend:** Node.js 22 LTS, NestJS ^11.0, TypeScript ^5.7, Prisma ^6.4, PostgreSQL 16.
- **Frontend:** React ^19.0, TypeScript ^5.7, Vite ^6.2, Tailwind CSS ^4.0 (@theme tabanlı), Zustand ^5.0, Konva ^9.3 / React-Konva (React 19 uyumlu), Lucide-react.
- **Monorepo:** pnpm 10 workspace — `packages/{contracts, backend, frontend}`.
  - `packages/contracts`: `zod` paketini `peerDependencies` olarak tanımlar (çift kopyadan kaynaklanan `instanceof ZodError` hatalarını önler). `tsup` ile derlenir (`tsup src/index.ts --format cjs,esm --dts`). Geliştirme sırasında `tsup --watch` çalıştırılır. Hem NestJS runtime require hem de Vite doğrudan tüketir.
- **Ağ ve Reverse Proxy (Same-Origin Kuralı):**
  - CORS Preflight (OPTIONS) kaynaklı keepalive kopmalarını önlemek için API ve Frontend her zaman **Same-Origin** çalışır:
    - *Geliştirme (Dev):* Vite `server.proxy` ile `/api` backend'e yönlendirilir.
    - *Canlı (Prod):* Nginx / Traefik / Cloudflare reverse proxy ile `/api` aynı köken altında barındırılır.
- **Önbellek & Async:** Redis 7 (Faz 1: throttling + token blacklist; Faz 2: pub/sub + queue).
- **Medya / Nesne Depolama:** S3-uyumlu depolama (Lokal Geliştirme: Docker SeaweedFS / Garage; Canlı: AWS S3 / Cloudflare R2 / Kurumsal S3), `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
- **Tainted Canvas Önlemi:** S3/Depolama bucket'ına CORS kuralı (`AllowedOrigin: *`, `AllowedMethod: GET, HEAD`) tanımlanır. Frontend'de Konva görselleri `image.crossOrigin = "anonymous"` ile yüklenir (böylece `stage.toDataURL()` ve PDF export çalışırken Canvas kirlenmez/hata vermez).

### Güvenlik Çerçevesi:
- Zero Trust Canvas (doğru cevaplar ve çözüm anahtarları asla istemciye gitmez).
- AES-256-GCM (uygulama seviyesinde şifreleme, `EncryptionService`).
- Özel medya: fileKey + 5 dk süreli pre-signed URL (doğrudan public URL yasak).
- Ortak eğitim medyası: `shared-assets/` dizininde kalıcı önbellekli, kotadan muaf (0 byte).
- PostgreSQL transaction advisory locks (`pg_try_advisory_xact_lock`).
- Konfigürasyon: `@nestjs/config` + Zod ile tip güvenli `env.validation.ts`.

---

## 🚀 FAZ 1 (MVP) — 6 Hafta
**Amaç:** Çalışan, güvenli, öğretmenin tahta hazırlayıp yayınlayabildiği, öğrencinin çözüp öğretmenin rapor alabildiği çekirdek sistem. (Tüm DB modelleri migration yükü olmasın diye Faz 1'de açılır; Topluluk/Keşfet arayüzleri Faz 1c'ye ayrılmıştır).

### 1.1. Veri Modeli & Şema Kararları
| Alan / Model | Karar | Neden |
|---|---|---|
| `User.role` | Enum: `TEACHER`, `STUDENT` | Basit ve hafif başlangıç; Faz 3'te Membership'e taşınacak |
| `Classroom.code` | 8 karakter Crockford Base32 | 32^8 ≈ 1.1 trilyon kombinasyon; I, L, O, U harfleri yok, karışıklığı önler |
| `Folder.orderIndex` | String (fractional-indexing) | Sayısal float precision hatalarını ve toplu re-order maliyetini önler |
| `Board.canvasData` | JSONB + CHECK (`octet_length("canvasData"::text) < 5242880`) | 5MB ham veri sınırı (`octet_length` ile kesin uygulanır) |
| `Board.encryptedSecretAnswers` | Text (AES-256-GCM base64) | Uygulama seviyesinde şifrelenir; sunucu belleğinde decrypt edilir; Faz 1b'de KMS |
| `BoardPublication.mode` | Enum: `PRACTICE`, `EXAM` | **Mod tahtada DEĞİL yayında tutulur (tek doğruluk kaynağı).** Aynı tahta bir sınıfa alıştırma, başka bir sınıfa sınav olarak yayınlanabilir. `Board` modelinde `mode` alanı YOKTUR; tüm mod kontrolleri `submission.publication.mode` üzerinden yapılır. PRACTICE (anında dönüt + 3 deneme hakkı), EXAM (deadline'a kadar kilitli + Cevabı Göster widget'ı sunucuda tamamen deaktif) |
| `BoardPublication.deadline` | DateTime? | Bir tahta farklı sınıflara farklı tarihlerle yayınlanabilir; deadline tahtada DEĞİL yayında tutulur. EXAM modunda Zod/DTO ile zorunlu ve gelecekte bir tarih (`deadline > now()`), PRACTICE modunda opsiyoneldir |
| `Submission` | Model: `publicationId`, `studentId`, `score: Float @default(0)`, `canvasData` (JSONB 2MB sınır), `status: DRAFT/SUBMITTED/CLOSED` | `@@unique([publicationId, studentId])`. Öğrencinin tekil teslimatını, puan artışını, ısı haritasını ve 409 kilit kontrollerini garanti eder |
| `SubmissionAnswer` | **Ayrı İlişkisel Model** | `submissionId`, `widgetId`, `optionId`, `attempts`, `isCorrect`. `@@unique([submissionId, widgetId])`. Yarış durumunu önler, atomik deneme sayacı sunar ve ısı haritasını O(1) SQL GROUP BY yapar |
| `MediaAsset.fileKey` | `users/{userId}/{uuid}.{ext}` (Özel) VEYA `shared-assets/{category}/{slug}.{ext}` (Ortak) | Özel medya 500MB kullanıcı kotasından düşer; Ortak eğitim medyaları 0 byte harcar |
| `MediaAsset.size` | BigInt | Kullanıcı kotasının fiziksel mutabakatı için dosya bayt boyutu |
| `MediaAsset.isGlobal` | Boolean (@default(false)) | Platform geneli ortak eğitim kütüphanesi materyali mi? |
| `AuditLog.actorRole` | Enum: `SYSTEM`, `TEACHER`, `STUDENT`, `ADMIN` | `actorId` nullable, `actorRole` zorunlu (Cron ve sistem işlemleri SYSTEM yazar) |
| `Board.isPublic` | Boolean (@default(false)) | Topluluk kütüphanesinde sergilenme durumu |
| `Board.cloneCount` | Int (@default(0)) | Kaç öğretmen tarafından kendi alanına kopyalandığı |
| `Board.trendingScore` | Float (@default(0)) | Son 14 günün fork hızına göre saatlik cron ile hesaplanan trend skoru |
| `Board.bayesianScore` | Float (@default(0)) | Bayesian formülüyle ağırlıklı puan (saatlik cron ile sistem ortalamasına göre güncellenir) |
| `Board.ratingAvg` & `ratingCount` | Float (@default(0)) & Int (@default(0)) | Ortalama yıldız ve toplam oy sayısı |
| `Board.favoriteCount` | Int (@default(0)) | Favorilere eklenme sayısı |
| `Board.originalBoardId` | String? (self-relation) | Fork/Remix soy ağacı ve yazar atfı takibi |
| `BoardRating` & `BoardFavorite` | İlişkisel Modeller | Öğretmenlerin 1-5 yıldız vermesi ve favorilemesi |
| `BoardCollection` | İlişkisel Model | Çoklu tahta paketleri (örn: "8. Sınıf LGS Matematik Seti") |

### 1.2. Çekirdek İş Mantıkları
- **Ayrılmış Kayıt & Okul Dostu Auth Throttling:** 
  - Öğretmen bağımsız kayıt olur; öğrenci sınıf kodu ile kaydolur.
  - *Öğrenci Kayıt Rate Limiti:* Rate limit anahtarı **`ip + ":register:" + body.username`** olarak ayarlanır (5 deneme/dk/öğrenci).
  - *Sınıf Kodu Brute-Force Koruması:* Kod tahmin saldırılarını engellemek için kod başına DEĞİL; **IP başına başarısız deneme sayısı (`failed_class_codes:{ip}`)** sayılır (20 başarısız deneme / 15 dk / IP). Doğru kodla gelen 30 öğrenci bundan asla etkilenmez.
  - *Giriş Sonrası İstek Limiti:* IP bazlı limit (300/dk) **YALNIZCA anonim/unauthenticated** uçlara uygulanır. Giriş yapmış kullanıcılar için limit **User ID bazlıdır (120 istek / dk / kullanıcı)**; ders başında 30 öğrenci 600 görsel çekse bile kilitlenme yaşanmaz.
- **Tenant Filtreleme & Raw SQL İzolasyonu:** 
  - Prisma Client Extension genel kullanımda tenant filtreler.
  - *Kota için Koşullu Atomik Sorgu:* Kullanıcının `storageLimitBytes` değeri okunur (`limit`). Ardından tek bir atomik sorgu ile artırılır:
    `updateMany({ where: { id: userId, storageUsedBytes: { lte: limit - size } }, data: { storageUsedBytes: { increment: size } } })` (`size` BigInt olarak cast edilir). Bu sorgu satır kilidi ile paralel yüklemeleri bozmadan güvenle çalıştırır.
  - *Cron için Raw SQL İzni:* `pg_try_advisory_xact_lock`, `FOR UPDATE SKIP LOCKED` ve toplu sıralama güncellemeleri (`UPDATE "Board" ... FROM subquery`) Prisma API'sinde bulunmadığı için raw SQL yetkisi yalnızca cron servislerinde kullanılmak üzere `CronPrismaService`'e verilir.
- **Etkileşimli Tuval & HTML Overlay Mimarisi (KRİTİK):** 
  - Çizimler, serbest fırça darbeleri ve geometrik şekiller Konva 2D Canvas katmanında tutulur.
  - 4 interaktif widget (Mini Test, Cevabı Göster, Adım Adım, Kronometre) Konva çizim nesnesi olarak değil, Canvas üzerine CSS `absolute` ve `pointer-events-auto` ile binen **zengin HTML/Tailwind Overlay** olarak çalışır.
  - Undo/redo (max 50 adım), şablon zeminler, modal notlar.
- **Responsive Tuval (Sanal Çözünürlük - Virtual Scale 1920x1080):** 
  - Tuval 1920x1080 baz sanal koordinat sistemiyle çalışır. Öğrencinin ekran çözünürlüğüne göre Konva `stage.scale({ x: scaleRatio, y: scaleRatio })` ve CSS transform ile orantılı ölçeklenir; hiçbir widget ekran dışına taşmaz.
- **Evaluation Modları & Yarış Durumsuz Atomik Deneme (KRİTİK):**
  - *İlk Deneme Satırı Garantiye Alma (Pre-population):*
    - Öğrencinin ilk cevabında `SubmissionAnswer` satırı henüz veritabanında bulunmadığı için doğrudan `updateMany` çağrılırsa `count === 0` döner ve öğrenci daha ilk hakkında haksız yere `400 MaxAttemptsExceededException` alır. Bu nedenle:
      1. `Submission` oluşturulurken tahtadaki tüm interaktif widget'lar için `submissionAnswer.createMany({ data: widgets.map(w => ({ submissionId, widgetId: w.id, attempts: 0 })), skipDuplicates: true })` ile satırlar peşin açılır.
      2. Değerlendirme servisinde de savunmacı yaklaşımla `updateMany`'den hemen önce tek satırlık `createMany({ data: [{ submissionId, widgetId, attempts: 0 }], skipDuplicates: true })` çalıştırılarak satırın varlığı garanti altına alınır.
  - *PRACTICE (Alıştırma Modu):* 
    - Öğrenci şık seçtiğinde sunucu anında dönüt verir (`{ correct: boolean }`).
    - 4 seçenekli soruda 3 deneme hakkı pedagojik tercihtir.
    - *Doğru Cevabın Ezilmesini Önleme:* Öğrenci bir soruyu doğru çözdükten sonra kalan haklarıyla farklı bir şık gönderirse doğru cevabının `false` ile ezilmesini önlemek ve paralel yarış durumunu engellemek için tek bir atomik koşullu Prisma sorgusu çalıştırılır:
      `updateMany({ where: { submissionId, widgetId, attempts: { lt: 3 }, OR: [{ isCorrect: null }, { isCorrect: false }] }, data: { attempts: { increment: 1 }, optionId, isCorrect } })`.
    - **UYARI (`not` KULLANMA):** Prisma'da `isCorrect: { not: true }` filtresi NULL değerli satırları sonuçtan dışlar. Peşin açılan satırlarda `isCorrect` NULL olduğu için ilk deneme `count === 0` döner ve öğrenci yanlışlıkla `MaxAttemptsExceeded` alır. Bu yüzden NULL açıkça `OR: [{ isCorrect: null }, { isCorrect: false }]` ile eşleştirilir.
    - Eğer `count === 0` dönerse: Soru zaten daha önce doğru mu çözülmüş (`isCorrect === true` ise `400 QuestionAlreadySolvedException`) yoksa deneme hakkı mı dolmuş (`attempts >= 3` ise `400 MaxAttemptsExceededException`) kontrol edilip uygun dönüt verilir; analitikte doğru yapılan soru asla bozulmaz.
    - Doğru cevap verildiğinde `Submission.score` alanı (her doğru soru 10 puan) atomik olarak artırılır.
    - Bot saldırılarına karşı Redis soru bazlı 3 sn throttling uygulanır.
    - *Auto-Save-Diff Yasağı:* `POST /auto-save-diff` endpoint'i PRACTICE modunda çağrılırsa deneme sınırını baypas etmemesi için derhal **`403 Forbidden: PracticeModeAutoSaveNotAllowedException`** döner.
  - *EXAM (Sınav/Ödev Modu):* 
    - *Zorunlu Deadline:* `BoardPublication` oluşturulurken `mode === 'EXAM'` ise `deadline` alanı zorunludur ve gelecekte bir tarih (`deadline > now()`) olmalıdır. Deadline verilmezse yayın açılamaz (`400 BadRequestException`). PRACTICE modunda ise `deadline` opsiyoneldir (`DateTime?`).
    - İstemci şık seçtiğinde seçim sunucu tarafında `SubmissionAnswer` içine kaydedilir, doğru/yanlış bilgisi **teslim süresi (deadline) dolana kadar öğrenciye asla dönülmez.** 
    - "Cevabı Göster" widget'ı sunucu tarafında tamamen devre dışı bırakılır ve şifresi çözülmez.
    - Kapanış anında gelen `widgetId` ve `optionId` değerleri, tahtanın kendi widget'larına karşı Zod ile şema kontrolünden geçirilir.
- **Deadline Cron, Çift Aşamalı Auto-Save & Evrensel 409 Kilit Mimarisi:**
  - Sunucu tarafında `CronPrismaService` ile `pg_try_advisory_xact_lock` + `FOR UPDATE SKIP LOCKED` (100'lük batch) çalışır.
  - *Evrensel 409 Kilit Kuralı (`SubmissionWritableGuard`):* Eğer tahtanın teslim süresi geçmişse (`publication.deadline < now()`) veya tahta teslim edilmişse (`status === 'SUBMITTED' || status === 'CLOSED'`), Submission'a veri yazan **TÜM endpoint'ler** (`PUT /auto-save`, `POST /auto-save-diff`, `POST /evaluate`, `POST /submit` vb.) `SubmissionWritableGuard` tarafından engellenir ve derhal **`409 Conflict: SubmissionClosedException`** döner. Süre bittikten sonra veya sonuçlar açıklandıktan sonra öğrenci cevabını veya çizimini asla değiştiremez.
  - *Periyodik Çizim Kaydı (Her 30 sn):* Tuvaldeki çizim verisi `PUT /api/submissions/:id/auto-save` isteğiyle `Submission.canvasData` kolonuna kaydedilir.
  - *Kapanış Anı (`beforeunload` / `visibilitychange` - Sadece EXAM):* `keepalive: true` ile son işaretlenen şıklar (`answers: Record<widgetId, optionId>`) `POST /api/submissions/:id/auto-save-diff` endpoint'ine gönderilir ve `SubmissionAnswer` tablosuna yazılır. Same-Origin mimarisi sayesinde CORS preflight engeli oluşmaz.
- **Medya & S3 Akışı:**
  - *Özel Medya:* Magic-byte kontrolü, S3 stream, atomik kota kontrolü, 5 dk TTL pre-signed URL.
  - *Ortak Eğitim Medyası (`shared-assets/`):* Platform merkezinde hazır sunulur, kotadan muaf (0 byte) ve kalıcı önbelleklidir.
- **BigInt Serileştirme Kuralı:**
  - `storageUsedBytes` ve `storageLimitBytes` gibi BigInt alanlar global `bigint-serialization.interceptor.ts` ve Prisma Client extension ile JSON çıktısında `Number` veya `String`'e cast edilir (`TypeError: Do not know how to serialize a BigInt` engellenir).
- **Analitik (Isı Haritası):** 
  - `SubmissionAnswer` ilişkisel modeli sayesinde soru bazlı başarı oranı doğrudan yüksek performanslı SQL GROUP BY sorgusu ile hesaplanır:
    `prisma.submissionAnswer.groupBy({ by: ['widgetId', 'isCorrect'], where: { submission: { publicationId } }, _count: true })`.

### 1.3. Minimum Güvenlik (Vazgeçilmez)
- **JWT:** Access 15dk (jti), Refresh 7 gün (rotasyon, SHA-256 hash DB'de).
- **Refresh reuse:** Tüm session blacklist + audit log.
- **AES-256-GCM master key:** `.env` dosyasından okunur; `.gitleaks.toml` allowlist içine `.env.example` eklenerek CI patlaması önlenir.
- **Admin eylemleri:** AuditLog'a yazılır.

### 1.4. Gözlemlenebilirlik
- Pino JSON logger + PII redaction (`password`, `email`, `authorization`).
- Correlation ID middleware.
- Sentry + 30 gün log retention.

### 1.5. Test Altyapısı (Deterministik İzolasyon)
- Vitest: unit (servisler, guard'lar, evaluator).
- Supertest + testcontainers: Tek Postgres + Redis instance. 
- **Paralel Test Çakışmasını Önleme (KRİTİK):** Vitest entegrasyon testlerinde `fileParallelism: false` ayarı zorunlu kılınır. Her test sonunda **`afterEach` hook'unda `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`** çalıştırılarak testler birbirini ezmeden %100 temiz ve izole koşturulur.
- Playwright: Canvas JSON snapshot (piksel diff DEĞİL). `window.__canvasReady` beklentisi eklenecek.

---

## 🛡️ FAZ 1b — 4 Hafta (Sertleştirme & KVKK)
*Topluluk vitrini açılmadan önce yasal ve altyapısal sertleştirme tamamlanır.*
- Katmanlı rate limiting (auth, API 120/dk/user, WS 60/sn).
- Idempotency-Key + IdempotencyRecord tablosu (24 saat TTL).
- Audit genişletme: oldValues, newValues, actorRole.
- KVKK ve Gizlilik Motoru: soft-delete, unutulma hakkı, PII anonimleştirme, export endpoint, herkese açık paylaşım öncesi öğrenci isim/not tarayıcısı.
- Prometheus + Grafana metrikleri.
- AWS Secrets Manager / Vault; key rotation.
- %80 unit, %60 integration, %100 kritik path e2e.

---

## 🎨 FAZ 1c — 3 Hafta (Topluluk & Keşfet Pazaryeri)
*Faz 1'de DB şeması hazır olan topluluk özelliklerinin arayüz, arama ve fork altyapısı bu fazda tamamlanır.*
- **4 Boyutlu Taksonomi:** Kademe (1-12), Branş (Matematik, Fen vb.), MEB Kazanım Kodu (örn. `MAT.8.1.1.1`), İçerik Formatı.
- **Toplu Sıralama Cron'ları (CronPrismaService ile Raw SQL):**
  - 🔥 *Trendler (Hot):* `trendingScore` kolonu (son 14 günün fork hızına göre saatlik cron ile tek bir `UPDATE "Board" ... FROM subquery` ile hesaplanır). İndeks: `@@index([isPublic, trendingScore(sort: Desc)])`.
  - ⭐ *En Yüksek Puanlılar:* Bayesian ağırlıklı puan kolonu (`bayesianScore` - saatlik cron ile tek sorguda genel ortalama senkronize edilir). İndeks: `@@index([isPublic, bayesianScore(sort: Desc)])`.
  - 👥 *En Çok Kullanılanlar (All-Time):* `cloneCount` şampiyonları. İndeks: `@@index([isPublic, cloneCount(sort: Desc)])`.
  - ⏱️ *En Yeniler & Müfredata Güncel:* `createdAt(sort: Desc)` sıralaması.
  - 🎯 *Editörün Seçimi (Rozetli):* Pedagojik onaylı içerikler.
- **Fork Sırasında Tek Adımda Kota Rezervasyonu & Saga Telafisi (KRİTİK):**
  1. Kopyalanacak özel görsellerin toplam boyutu hesaplanır (`totalBytes: bigint`).
  2. Kullanıcının `storageLimitBytes` değeri okunur (`limit`).
  3. Tek bir atomik koşullu sorgu ile kota rezerve edilir:
     `updateMany({ where: { id: teacherId, storageUsedBytes: { lte: limit - totalBytes } }, data: { storageUsedBytes: { increment: totalBytes } } })`. Yetersizse S3'e gidilmeden `400 InsufficientStorageQuotaException` fırlatılır.
  4. S3 `CopyObject` işlemleri yürütülür (başarılı anahtarlar listelenir).
  5. S3 kopyalama başarılı olduktan SONRA Prisma `$transaction` ile yeni `Board` ve `MediaAsset` kayıtları oluşturulur.
  6. Hata durumunda `catch` bloğunda kopyalanan S3 dosyaları silinir (`DeleteObjects`) ve kota iade edilir (`decrement: totalBytes`).
- **Gece Kota Mutabakat Cron'u (Storage Reconciliation Cron):**
  - Sunucu çökmesi veya beklenmeyen crash durumlarında oluşabilecek kota sızıntılarını gidermek için her gece 03:00'te çalışan `StorageReconciliationCronService`, `storageUsedBytes = SUM(MediaAsset.size)` sorgusuyla kullanıcı kotalarını fiziksel depolamayla %100 eşitler.
- **Fork / Remix Soy Ağacı:** `originalBoardId` üzerinden orijinal yazara saygı ve atıf kartı.
- **Hızlı Önizleme (Quick Preview Modal):** Klonlamadan önce tahta sayfalarını ve sorularını gezme.
- **Ortak Medya Çekmecesi:** Tuvalin sol araç çubuğunda sürükle-bırak eğitim grafikleri.

---

## ⚡ FAZ 2 — 6 Hafta (Realtime + CRDT)
- WebSocket Gateway + WsGuard (JWT handshake) + WsTenantGuard.
- Anlık quiz, geçici kalem izni (30sn), öğrenci çözümünü yansıtma.
- İleri widget'lar: sürükle-bırak eşleştirme, sesli notlar, rastgele öğrenci seçici.
- Konva→Yjs binding spike (1 hafta) — çalışmazsa OT veya lock-based'e düş.
- BoardUpdate tablosu (Bytes, actorId, createdAt) — 30 gün sonra arşiv.
- Her 100 update veya 5 dakikada canvasData snapshot.

---

## 🏛️ FAZ 3 — 8 Hafta (Multi-Tenant B2B)
- Organization → Branch → Classroom hiyerarşisi.
- Membership tablosu (çoklu rol: bir kullanıcı A okulunda öğretmen, B'de veli).
- Yeni roller: SchoolAdmin, Parent.
- PostgreSQL RLS: `SET LOCAL app.current_tenant` (session variable).
- **Prisma Interactive Transaction Kuralı (KRİTİK):** `SET LOCAL` sadece bir transaction bloğunda geçerlidir. Prisma'da bağlantı havuzu kirlenmesini önlemek için her tenant istek `prisma.$transaction(async (tx) => ...)` ile sarılmalıdır; bağlantı havuzu boyutlandırması ve interactive transaction timeout süreleri önceden yapılandırılmalıdır.
- RLS politikasında alt sorgu YASAK: `tenant_id = current_setting('app.current_tenant')::uuid` şeklinde.
- Her istek başında X-Tenant-Id header + guard doğrulaması.
- Toplu içerik kütüphanesi: okul şablonları, zümre klasörleri.

---

## 🧠 FAZ 4 (İleri Seviye — AI)
- Öğretmen AI asistanı: kazanım + seviye → otomatik soru/şema/çizim taslağı.
- Akıllı eksik analizi: mikro-kazanım bazında harita.
- Kişiye özel çalışma kağıdı.
- KVKK: Açık rıza + DPA; lokal LLM (Llama/Mistral) veya anonimleştirme.
- AI çıktısı öğretmen onayından geçer; otomatik puanlama YASAK.
- Prompt injection savunması: kullanıcı girdisi asla system prompt'a interpolate edilmez.

---

# 📜 BÖLÜM 2: 5 ADIMLI KOD ÜRETİM PROMPTLARI
**Kullanım:** Antigravity/Cursor/Claude Code'a sırayla ver. Her adım bittikten sonra bir sonrakine geç. Model context'i taşmaz, halüsinasyon riski düşer.

## 🔧 ADIM 1: Altyapı, Veri Modeli ve Güvenlik Çekirdeği
```markdown
Sen kıdemli bir DevOps ve Backend Mimarısın. EduBoard SaaS platformunun 
"Faz 1: Altyapı ve Veri Katmanı"nı sıfırdan ve eksiksiz kuracaksın.

### Ortam ve Sabitlenmiş Sürümler
- Node.js 22 LTS, TypeScript ^5.7, pnpm 10 workspace
- /packages/contracts   → Zod şemaları (zod peerDependencies), tsup ile derlenen CJS/ESM/DTS
- /packages/backend     → NestJS ^11.0, Prisma ^6.4
- /packages/frontend    → React ^19.0, Vite ^6.2, Tailwind CSS ^4.0 (@theme tabanlı)

### Mimari Kurallar
1. Stack: PostgreSQL 16 (pgcrypto aktif), Redis 7, S3 uyumlu depolama (Lokalde SeaweedFS/Garage). S3 bucket CORS kuralı yapılandırılır.
2. ŞİFRELEME: Faz 1'de şifreleme UYGULAMA SEVİYESİNDE (AES-256-GCM) yapılacak. `Board.encryptedSecretAnswers` Text (base64) olarak tutulur; EncryptionService yönetir.
3. Prisma CHECK constraint: Prisma ORM `@db.Check` desteklemez. 
   canvasData (<5MB) ve submission canvasData (<2MB) kontrolleri migration.sql'e raw ALTER TABLE ile eklenir. Boyut kontrolünde octet_length kullanılmalıdır:
   CHECK (octet_length("canvasData"::text) < 5242880) -- Board tablosu
   CHECK (octet_length("canvasData"::text) < 2097152) -- Submission tablosu
4. Folder.orderIndex: String (fractional-indexing paketine uyumlu).
5. Medya Yolları: 
   - Özel Medya: `users/{userId}/{uuid}.{ext}` (500MB kullanıcı kotasına dahil, pre-signed URL).
   - Ortak Eğitim Medyası: `shared-assets/{category}/{slug}.{ext}` (kotadan muaf 0 byte, kalıcı önbellekli).
6. Classroom.code: 8 karakter Crockford Base32.
7. Env yönetimi: @nestjs/config + Zod ile env.validation.ts oluştur.
8. BigInt Serileştirme (KRİTİK): PostgreSQL BigInt alanları (`storageUsedBytes`, `storageLimitBytes`, `MediaAsset.size`) JSON serileştirmede `TypeError: Do not know how to serialize a BigInt` hatası vermemesi için Prisma Client extension veya serializer interceptor ile string/number'a cast edilir.
9. .gitleaks.toml: .env.example dosyasındaki örnek 64 hex anahtarın CI testlerini patlatmaması için [allowlist] paths = [".env.example"] kuralı eklenmelidir.

### Migration Akışı (KRİTİK)
- schema.prisma yazıldıktan sonra terminalde:
  1. `npx prisma migrate dev --name init --create-only`
  2. Oluşan migration.sql dosyasına CHECK constraint'ler (Board ve Submission için octet_length) ve `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` elle eklenir.
  3. `npx prisma migrate dev` çalıştırılır.

### Üretilecek Dosyalar (Eksiksiz, placeholder'sız)

1. `pnpm-workspace.yaml`
2. `docker-compose.yml` → Postgres 16, Redis 7, S3 uyumlu depolama container'ı + bucket oluşturan ve CORS kurallarını tanımlayan servis.
3. `docker/postgres/init-pgcrypto.sql`
4. `.env.example` (DATABASE_URL, REDIS_URL, vb. ENCRYPTION_MASTER_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef [64 hex karakter])
5. `.gitleaks.toml` (ENCRYPTION_MASTER_KEY kuralı + .env.example allowlist)
6. `packages/backend/prisma/schema.prisma`:
   - Modeller: User, Classroom, ClassroomMember, Folder, Board, BoardPublication, Submission, SubmissionAnswer, AuditLog, MediaAsset, BoardRating, BoardFavorite, BoardCollection, BoardCollectionItem.
   - Enums: Role (TEACHER, STUDENT), ActorRole (SYSTEM, TEACHER, STUDENT, ADMIN), BoardMode (PRACTICE, EXAM), SubmissionStatus (DRAFT, SUBMITTED, CLOSED).
   - BoardPublication: `id`, `boardId`, `classroomId`, `mode: BoardMode` (PRACTICE/EXAM — modun TEK doğruluk kaynağı burasıdır), `deadline: DateTime?` (EXAM modunda Zod/DTO ile zorunlu ve `deadline > now()`, PRACTICE modunda opsiyonel), `isResultsPublished: Boolean @default(false)`, `createdAt`, `updatedAt`.
   - Submission: `id`, `publicationId: String`, `studentId: String`, `score: Float @default(0)`, `canvasData: Json @default("{}")` (JSONB 2MB çizim), `status: SubmissionStatus @default(DRAFT)`, `createdAt`, `updatedAt`. `@@unique([publicationId, studentId])`, `@@index([publicationId])`, `@@index([studentId])`.
   - SubmissionAnswer: `id`, `submissionId`, `widgetId`, `optionId: String?`, `attempts: Int @default(0)`, `isCorrect: Boolean?`, `createdAt`, `updatedAt`. `@@unique([submissionId, widgetId])`, `@@index([widgetId, isCorrect])`.
   - Board modeli (`mode` alanı YOK — mod BoardPublication'dadır): `isPublic`, `cloneCount`, `trendingScore`, `bayesianScore`, `ratingAvg`, `ratingCount`, `favoriteCount`, `gradeLevel`, `subject`, `topic`, `tags`, `originalBoardId`.
   - MediaAsset alanları: `fileKey`, `size: BigInt`, `isGlobal` (Boolean @default(false)), `category`, `title`, `tags`.
   - PostgreSQL indeksleri: `@@index([isPublic, trendingScore(sort: Desc)])`, `@@index([isPublic, bayesianScore(sort: Desc)])`, `@@index([isPublic, cloneCount(sort: Desc)])`, `@@index([originalBoardId])`.
7. `packages/backend/prisma/migrations/<timestamp>_init/migration.sql` (Prisma + Check Constraints [Board ve Submission octet_length] + pgcrypto).
8. `packages/backend/prisma/seed.ts` (mock kullanıcılar, sınıflar, ortak eğitim medyaları, örnek tahtalar ve kategoriler).
9. `packages/backend/package.json` (NestJS ^11.0, Prisma ^6.4 bağımlılıkları).
10. `packages/contracts/package.json` + `packages/contracts/tsconfig.json` + `packages/contracts/tsup.config.ts` (tsup src/index.ts --format cjs,esm --dts çıktısı ile derlenecek, zod peerDependencies olacak).
11. `packages/frontend/package.json` (React ^19.0, Vite ^6.2, Tailwind ^4.0, Zustand ^5.0, react-konva).

Tüm dosyaları importları, tipleri ve açıklamalarıyla eksiksiz üret. Placeholder KULLANMA.
```

## 🔐 ADIM 2: Sözleşmeler, Güvenlik Çekirdeği ve Auth Modülü
```markdown
Sen kıdemli bir Backend Güvenlik Mühendisisin. EduBoard projesinde 1. Adımda oluşturulan Prisma şeması üzerine "Ortak Sözleşmeler, Güvenlik Çekirdeği ve Auth Modülü"nü inşa edeceksin.

### Mimari Kurallar
1. Widget Kontratları (packages/contracts):
   - Zod ile `BoardSecretAnswersPayloadSchema`. Hem frontend hem backend import edecek.
   - Zod ile `BoardModeEnum` (PRACTICE, EXAM), `SubmissionAutoSaveDiffPayloadSchema` (Kapanış anı için küçük answers diff'i - EXAM moduna özel).
2. Şifreleme (AES-256-GCM):
   - `EncryptionService` (NestJS @Injectable). Format: `iv:authTag:ciphertext` (hepsi base64).
3. Env Yönetimi (KRİTİK):
   - `env.validation.ts` içinde `export function validateEnv(config: Record<string, unknown>)` fonksiyonunu yaz. Bu fonksiyon Zod ile parse edip sonucu dönsün veya hata fırlatsın.
   - `app.module.ts` içinde `ConfigModule.forRoot({ validate: validateEnv, isGlobal: true })` olarak kullan.
4. Okul Dostu Auth & İstek Throttling (Redis): 
   - *Öğrenci Kaydı:* Rate limit anahtarı `ip + ":register:" + body.username` (5 deneme/dk).
   - *Sınıf Kodu Tahmin Koruması:* Kod başına değil, IP başına başarısız denemeler sayılır (`failed_class_codes:{ip}` - 20 hatalı deneme/15 dk).
   - *Genel İstekler:* IP bazlı 300/dk limiti sadece unauthenticated uçlara uygulanır; giriş yapmış kullanıcılarda limit User ID bazlıdır (120 istek/dk).
5. BigInt JSON Serileştirici (KRİTİK):
   - `bigint-serialization.interceptor.ts` (JSON.stringify çökmesini önler, BigInt alanları string/number'a çevirir).
6. Tenant Filtreleme ve Raw SQL İzolasyonu (KRİTİK):
   - `PrismaService` (Tenant Extension'lı) genel kullanım içindir.
   - `CronPrismaService` (Extension'sız, raw SQL izinli) cron servisleri (DeadlineCronService, RankingCronService, StorageReconciliationCronService) için yaratılır.
7. Gözlemlenebilirlik: Pino logger (PII redaction), Correlation ID middleware.

### Üretilecek Dosyalar
1-2. `packages/contracts/src/widget.contracts.ts` & `index.ts`
3. `packages/backend/src/config/env.validation.ts`
4-5. `packages/backend/src/common/encryption/encryption.service.ts` & `module.ts`
6-7. `packages/backend/src/common/prisma/prisma.service.ts` (İki farklı servis: `PrismaService` ve `CronPrismaService`) & `prisma-tenant.extension.ts`
8-9. `packages/backend/src/common/interceptors/bigint-serialization.interceptor.ts` & `global-exception.filter.ts`
10. `packages/backend/src/common/middleware/correlation-id.middleware.ts`
11. `packages/backend/src/common/redis/redis.module.ts` + `redis.service.ts`
12-18. `packages/backend/src/auth/*` (DTO, stratejiler, guard'lar, controller, module).

Tüm kodları derlenebilir ve tip güvenli olarak üret. Placeholder KULLANMA.
```

## ⚙️ ADIM 3: Sınıf, Tahta, Değerlendirme, Medya ve Cron (Faz 1 MVP Çekirdeği)
```markdown
Sen kıdemli bir NestJS Uzmanısın. EduBoard sisteminin Faz 1 MVP iş mantığı katmanını kodlayacaksın.

### Mimari Kurallar
1. Sınıf Kodu (Bias-Free):
   - `crypto.randomBytes(5)` kullanarak 40 bit BigInt oluştur. Bunu Crockford Base32 alfabesine map ederek 8 karakterli kod üret. 5 collision hakkı.
2. Yayın & Evaluation Modları (KRİTİK):
   - *Yayın Doğrulaması (Publication):* `CreatePublicationDto` içinde `mode === 'EXAM'` ise `deadline` alanı zorunludur ve gelecekte bir tarih (`deadline > now()`) olmalıdır (`400 BadRequestException`). PRACTICE modunda ise `deadline` opsiyoneldir (`DateTime?`).
   - *İlk Deneme Satırı Garantiye Alma (Pre-population):*
     - Öğrenci bir yayını ilk açtığında `Submission` açılırken (`publicationId`, `studentId`, `@@unique([publicationId, studentId])`), tahtadaki tüm interaktif widget'lar için `SubmissionAnswer` satırları `createMany({ data: widgets.map(w => ({ submissionId, widgetId: w.id, attempts: 0 })), skipDuplicates: true })` ile peşin oluşturulur.
     - Değerlendirme servisinde de savunmacı yaklaşımla `updateMany` öncesinde tek satırlık `createMany({ data: [{ submissionId, widgetId, attempts: 0 }], skipDuplicates: true })` çalıştırılarak satırın varlığı garanti altına alınır.
   - *Board Response Güvenliği:* `encryptedSecretAnswers` KESİNLİKLE istemciye dönülmez.
   - *PRACTICE Modu:* 
     - İstemci optionId yollar, sunucu decrypt edip boolean `{ correct }` döner.
     - *Doğru Cevabın Ezilmesini Önleme:* Öğrenci soruyu doğru çözdükten sonra kalan haklarıyla başka bir yanlış şık gönderirse doğru cevabının ezilmesini önlemek için sorguya NULL-güvenli `OR` filtresi eklenir:
       `updateMany({ where: { submissionId, widgetId, attempts: { lt: 3 }, OR: [{ isCorrect: null }, { isCorrect: false }] }, data: { attempts: { increment: 1 }, optionId, isCorrect } })`.
       `isCorrect: { not: true }` KULLANILMAZ: Prisma `not` filtresi NULL satırları dışlar ve peşin açılan satırlarda ilk deneme yanlışlıkla reddedilir.
     - Mod kontrolleri (PRACTICE/EXAM) her zaman `submission.publication.mode` üzerinden yapılır; `Board` modelinde `mode` alanı yoktur.
     - Eğer `count === 0` dönerse: Soru daha önce doğru çözülmüşse (`isCorrect === true`) `400 QuestionAlreadySolvedException`, deneme hakkı dolmuşsa (`attempts >= 3`) `400 MaxAttemptsExceededException` döner; analitikte doğru yapılmış soru asla bozulmaz.
     - Soru doğru yanıtlandığında `Submission.score` alanı (her soru 10 puan) atomik olarak artırılır.
     - Redis soru bazlı 3 sn throttling uygulanır.
     - `POST /submissions/:id/auto-save-diff` endpoint'i PRACTICE modunda çağrılırsa `403 Forbidden: PracticeModeAutoSaveNotAllowedException` döner.
   - *EXAM Modu:* 
     - İstemci optionId yollar, sunucu seçimi SubmissionAnswer içine kaydeder; deadline bitene kadar doğru/yanlış cevabı ve puanı ASLA istemciye dönmez. "Cevabı Göster" widget'ı sunucuda tamamen deaktiftir.
3. Medya ve Kota: 
   - Kota: Önce kullanıcının `storageLimitBytes` okunur (`limit`). Ardından atomik koşullu sorgu çalıştırılır:
     `updateMany({ where: { id: userId, storageUsedBytes: { lte: limit - size } }, data: { storageUsedBytes: { increment: size } } })` (`size` BigInt olarak cast edilir). Yetersizse `400 InsufficientStorageQuotaException` döner.
   - Ortak Medya: `GET /media/shared` (kategori ve arama filtreli, kotadan muaf hazır eğitim materyalleri).
   - Özel Yükleme: magic-byte kontrol, S3 stream, 5 dk TTL pre-signed URL (HTTP 302).
4. Deadline Cron, İkili Auto-Save & Evrensel 409 Kilidi: 
   - `CronPrismaService` üzerinden `pg_try_advisory_xact_lock` ile transaction scope içinde FOR UPDATE SKIP LOCKED batch (100'lük) çalışır.
   - *Evrensel 409 Kilit Kuralı (`SubmissionWritableGuard`):* Eğer tahtanın süresi dolmuşsa (`publication.deadline < now()`) veya teslim edilmişse (`submission.status === 'SUBMITTED' || submission.status === 'CLOSED'`), Submission'a veri yazan **TÜM endpoint'ler** (`PUT /auto-save`, `POST /auto-save-diff`, `POST /evaluate`, `POST /submit` vb.) `SubmissionWritableGuard` tarafından engellenir ve derhal `409 Conflict: SubmissionClosedException` döner.
   - `PUT /submissions/:id/auto-save` (30 saniyede bir `Submission.canvasData` çizimini günceller).
   - `POST /submissions/:id/auto-save-diff` (sayfa kapanırken EXAM modunda `SubmissionAnswer` şık seçimlerini günceller; gelen widgetId tahtanın widget'larına karşı doğrulanır).

### Üretilecek Dosyalar
1-22. Classroom, Folder, Board, Publication, Submission (Auto-save ve auto-save-diff dahil), Media (Kota kontrolü ve S3 stream dahil), Analytics modülleri (SubmissionAnswer GROUP BY ısı haritası dahil), servisleri, controller'ları ve Cron Job (Deadline) dosyaları. 
DeadlineCronService içerisine `CronPrismaService` enjekte et, diğerlerine normal `PrismaService`. 

Fonksiyon gövdelerini DOLU yaz. Placeholder KULLANMA.
```

## 🎨 ADIM 4: Frontend İskeleti, Konva Tuval Motoru ve HTML Overlay
```markdown
Sen kıdemli bir Frontend Mimarı ve Canvas Uzmanısın. EduBoard platformunun Faz 1 "React ^19.0 + Vite ^6.2 + Tailwind ^4.0 + Konva.js" arayüzünü inşa edeceksin.

### Mimari Kurallar
1. Canvas & HTML Overlay Mimarisi (KRİTİK):
   - react-konva + konva: Çizimler, fırça darbeleri ve geometrik şekiller Canvas katmanında tutulur.
   - 4 İnteraktif Widget (Mini Test, Cevabı Göster, Adım Adım, Kronometre) Konva canvas primitive'i olarak değil; Canvas tuvali üzerine CSS `absolute` ve `pointer-events-auto` ile oturtulan **zengin HTML/Tailwind Overlay** bileşenleri olarak inşa edilir.
2. Tainted Canvas Koruması:
   - Tüm Konva görsel yüklemelerinde `image.crossOrigin = "anonymous"` kuralı uygulanır; `stage.toDataURL()` ve PDF dışa aktarma hatasız çalışır.
3. Sanal Çözünürlük Ölçekleme (Virtual Resolution 1920x1080):
   - Tahta koordinatları sabit 1920x1080 baz çözünürlük üzerinden saklanır. 
   - Öğrencinin ekran boyutuna göre Konva `stage.scale({ x: scaleRatio, y: scaleRatio })` ve Overlay CSS transform ile orantılı ölçeklenir; hiçbir öğe ekrandan taşmaz.
4. Undo/Redo: Zustand içinde `CanvasElement[][]` (max 50 adım).
5. E2E Test Flag'i (KRİTİK): Konva'nın `afterDraw` event'i tetiklendiğinde `window.__canvasReady = true` atanır.
6. Güvenli Kapanış & Auto-Save Hook (KRİTİK):
   - `useAutoSave` hook'u: 
     - Tuvalde değişiklik yapıldığında 30 saniyede bir normal arka plan `PUT /api/submissions/:id/auto-save` isteği atar (`canvasData` çizimi).
     - Sayfa kapanırken (`visibilitychange` / `beforeunload`):
       - Eğer yayın EXAM modundaysa (`publication.mode === 'EXAM'`): Same-origin `/api/submissions/:id/auto-save-diff` endpoint'ine `fetch(..., { keepalive: true, method: 'POST', headers: { 'Authorization': ..., 'Content-Type': 'application/json' }, body: JSON.stringify({ answers }) })` ile sadece son şıkları kurtarır.
       - Eğer yayın PRACTICE modundaysa (`publication.mode === 'PRACTICE'`): auto-save-diff atılmaz (deneme hakkı atlamasını önlemek için).
7. Mod Desteği (Öğretmen / Öğrenci).
8. Monorepo Build: `packages/contracts` paketi `tsup` ile derlenmiş `dist` dizini üzerinden temizce import edilir.

### Üretilecek Dosyalar
1-20. Vite/Tailwind configleri (server.proxy konfigürasyonu dahil), API/Zustand store'ları, Canvas bileşenleri (Toolbar, InteractiveBoard, HtmlOverlayContainer, Widgetlar) ve Sayfa iskeletleri (Teacher/Student Dashboard, Editor/Viewer).

Tüm JSX/TSX kodlarını eksiksiz üret. Placeholder KULLANMA.
```

## 🧪 ADIM 5: Entegrasyon, Test ve Uygulama Girişi
```markdown
Sen kıdemli bir QA ve Backend Mühendisisin. Modül birleşimini ve testleri yazacaksın.

### Test Edilecek Senaryolar (Özet)
Öğretmen kaydı, Öğrenci kaydı (aynı IP'den 30 öğrenci girişi testi), Sınıf kodu hatalı deneme throttling testi (20 hatalı deneme ban), Gizli anahtarlı tahta yayını (EXAM modunda deadline zorunluluğu doğrulaması), Zero Trust doğrulaması, EXAM modunda Cevabı Göster kilit kontrolü, PRACTICE modunda ilk deneme kabulü (pre-population), paralel istek yarış durumu ve 3 deneme kilit testi, Doğru cevabın sonradan ezilememesi testi (NULL-güvenli `OR` filtresi; ayrıca peşin açılmış NULL satırda ilk denemenin kabul edildiği test), Aynı tahtanın bir sınıfa PRACTICE başka sınıfa EXAM yayınlanması testi, Evaluation puan artışı testi (`Submission.score`), Kota aşımında atomik ret, Evrensel 409 kilit testi (süresi dolan sınavda evaluate, auto-save, auto-save-diff ve submit endpoint'lerinin 409 dönmesi).

### Test Altyapısı Kuralları (KRİTİK)
1. Supertest + testcontainers: Tek bir Postgres + Redis instance ayağa kaldırılacak.
2. Paralel Test Çakışmasını Önleme: Vitest entegrasyon testlerinde `fileParallelism: false` zorunlu kılınacak. Her test sonunda **`afterEach` hook'unda `TRUNCATE TABLE ... RESTART IDENTITY CASCADE`** çalıştırılacak.
3. Playwright: Canvas JSON snapshot işlemi öncesinde `page.waitForFunction(() => window.__canvasReady === true)` kullanılarak Konva'nın asenkron çizimi tamamlaması beklenecek.

### Üretilecek Dosyalar
1-13. AppModule, main.ts, configuration, testcontainers global setup, truncate database helper, unit/integration testleri, Playwright config/e2e testleri, CI/CD pipeline (GitHub Actions) ve README.md.

Testlerin mock ve assertion mantıklarını EKSİKSİZ üret. Placeholder KULLANMA.
```
