# QR Yoklama — Tam Proje Planı
> Repo adı · Branch stratejisi · Commit kuralları · Sprint planı · GitHub Issues

---

## Repo Adı

```
qr-attendance
```

GitHub URL:https://github.com/ozdemirCeng/qr-attendance.git
---

## Monorepo Yapısı (Turborepo)

```
qr-attendance/
├── apps/
│   ├── web/          → Next.js 15 (Admin + PWA Scanner)
│   ├── api/          → NestJS backend
│   └── worker/       → BullMQ job processor
├── packages/
│   ├── db/           → Drizzle schema + migrations
│   ├── shared/       → types, zod schemas, utils
│   └── ui/           → paylaşılan shadcn bileşenler
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
```

---

## Branch Stratejisi

```
main          → production/release
develop       → tek kişilik günlük geliştirme dalı
feature/*     → büyük/riskli işlerde opsiyonel kısa ömürlü dal
fix/*         → acil hata düzeltme dalı
chore/*       → config, deps, tooling işleri
```

### Kurallar
- Tek kişi geliştiriyorsa günlük iş akışı doğrudan `develop` üzerinde yapılabilir.
- `main` sadece release içindir; önerilen akış `develop` → `main` PR merge.
- Küçük işlerde branch açmak opsiyoneldir, büyük/riskli işlerde branch açılması önerilir.
- Her push öncesi lokal kalite kapısı: `pnpm lint`, `pnpm build`, `pnpm test`.
- Branch ismi kebab-case:
  - `feature/qr-token-service`
  - `feature/attendance-scan-flow`
  - `fix/location-accuracy-edge-case`

---

## Commit Konvansiyonu (Conventional Commits)

```
<type>(<scope>): <kısa açıklama>

type:
  feat      → yeni özellik
  fix       → bug düzeltme
  refactor  → davranış değişmeyen kod düzenleme
  chore     → build, config, deps
  test      → test ekleme/düzenleme
  docs      → dokümantasyon
  style     → lint, format (mantık değişmez)
  perf      → performans iyileştirmesi

scope (opsiyonel, modül adı):
  auth | events | sessions | qr | attendance
  participants | exports | imports | location | db | ui

Örnekler:
  feat(qr): implement HMAC-SHA256 token generation
  feat(attendance): add walk-in participant registration flow
  fix(location): handle missing GPS accuracy field
  chore(db): add Neon connection pooling config
  refactor(exports): move excel generation to worker
  test(qr): add token expiry and replay attack unit tests
```

---

## GitHub Labels

```
type: feature       #0075ca   yeni özellik
type: bug           #d73a4a   hata
type: chore         #e4e669   yapılandırma, bağımlılık
type: refactor      #cfd3d7   yeniden düzenleme
type: test          #0e8a16   test

priority: critical  #b60205   blocker
priority: high      #d93f0b   sprint içi kritik
priority: medium    #fbca04   normal akış
priority: low       #c5def5   nice-to-have

scope: auth         #f9d0c4
scope: qr           #fef2c0
scope: attendance   #c2e0c6
scope: location     #bfd4f2
scope: export       #d4c5f9
scope: ui           #e99695

status: in-progress #0052cc
status: blocked     #e11d48
status: review      #7057ff
```

---

## Sprint 0 — Proje Kurulumu
> **Süre:** 1 gün
> **Branch:** `chore/project-setup`

### Issues

---

**#1 — Turborepo monorepo iskelet**
`chore` `priority: critical`

```
[ ] pnpm + Turborepo init
[ ] apps/web, apps/api, apps/worker dizinleri
[ ] packages/db, packages/shared, packages/ui dizinleri
[ ] pnpm-workspace.yaml
[ ] turbo.json (build, dev, lint pipeline)
[ ] root package.json scripts:
      "dev"   → turbo dev
      "build" → turbo build
      "lint"  → turbo lint
[ ] .nvmrc (Node 20)
[ ] .gitignore
[ ] README.md iskelet
```

---

**#2 — TypeScript + ESLint + Prettier yapılandırması**
`chore` `priority: critical`

```
[ ] packages/config/tsconfig.base.json
[ ] packages/config/eslint-base.js
[ ] packages/config/prettier.config.js
[ ] Her app/package kendi tsconfig.json ile extend eder
[ ] Strict mode aktif
```

---

**#3 — Neon + Drizzle kurulumu**
`chore` `priority: critical` `scope: db`

```
[ ] packages/db bağımlılıkları: drizzle-orm, drizzle-kit, @neondatabase/serverless
[ ] packages/db/src/client.ts  → Neon bağlantısı
[ ] packages/db/src/schema/   → dizin oluştur
[ ] packages/db/drizzle.config.ts
[ ] .env.example dosyası:
      DATABASE_URL=
      REDIS_URL=
      QR_SECRET=
      BETTER_AUTH_SECRET=
      STORAGE_ENDPOINT=
      STORAGE_BUCKET=
      STORAGE_ACCESS_KEY=
      STORAGE_SECRET_KEY=
[ ] "db:generate" ve "db:migrate" scriptleri
```

---

**#4 — Next.js 15 app kurulumu**
`chore` `priority: critical`

```
[ ] apps/web: Next.js 15, App Router, TypeScript, Tailwind v4
[ ] shadcn/ui init
[ ] TanStack Query provider
[ ] lib/api.ts → typed fetch wrapper
[ ] lib/auth.ts → Better Auth client
[ ] Temel layout.tsx
[ ] Vercel.json / next.config.ts
```

---

**#5 — NestJS app kurulumu**
`chore` `priority: critical`

```
[ ] apps/api: NestJS, TypeScript strict
[ ] @nestjs/config → ConfigModule global
[ ] @nestjs/throttler → ThrottlerModule global
[ ] class-validator + class-transformer global pipe
[ ] @nestjs/swagger → SwaggerModule
[ ] GlobalExceptionFilter
[ ] cors yapılandırması (web origin whitelist)
[ ] Health check endpoint: GET /health
```

---

**#6 — Worker app kurulumu**
`chore` `priority: high`

```
[ ] apps/worker: NestJS standalone app
[ ] BullMQ bağımlılıkları
[ ] ioredis bağlantısı (Upstash)
[ ] export.queue processor iskeleti
[ ] import.queue processor iskeleti
[ ] Railway deploy config (Procfile veya railway.toml)
```

---

**#7 — CI/CD pipeline**
`chore` `priority: high`

```
[ ] .github/workflows/ci.yml:
      trigger: push to develop/main, PR to main
      jobs:
        - pnpm install
        - turbo lint
        - turbo build
        - turbo test (birim testler varsa)
[ ] Vercel GitHub entegrasyonu (web otomatik deploy)
[ ] Railway GitHub entegrasyonu (api + worker otomatik deploy)
[ ] Neon preview branch (release PR için opsiyonel)
```

---

## Sprint 1 — Auth & Event Yönetimi
> **Süre:** 3 gün
> **Base branch (solo):** `develop`

### Issues

---

**#8 — Veritabanı şeması: admins + events + sessions**
`feat` `priority: critical` `scope: db`
`Branch: feature/db-schema-core`

```
[ ] packages/db/src/schema/admins.ts
      id, email, password_hash, name, role, created_at
[ ] packages/db/src/schema/events.ts
      id, name, description, location_name,
      latitude, longitude, radius_meters,
      starts_at, ends_at, created_by, status, created_at
[ ] packages/db/src/schema/sessions.ts
      id, event_id, name, starts_at, ends_at, created_at
[ ] packages/db/src/schema/index.ts → hepsini export et
[ ] drizzle-kit generate → migration dosyası üret
[ ] drizzle-kit migrate → Neon'a uygula
[ ] packages/shared/src/types/event.ts → shared tipler
```

---

**#9 — Admin auth: login + session**
`feat` `priority: critical` `scope: auth`
`Branch: feature/admin-auth`

```
Backend:
[ ] AuthModule, AuthService, AuthController
[ ] POST /auth/login → email + password doğrula → session oluştur
[ ] POST /auth/logout → session sil
[ ] GET /auth/me → session bilgisi dön
[ ] Bcrypt ile password hash
[ ] Better Auth session (httpOnly cookie)
[ ] JwtAuthGuard → korumalı routelar için
[ ] RolesGuard → role bazlı yetkilendirme
[ ] @CurrentUser() decorator
[ ] @Roles() decorator

Frontend:
[ ] /login sayfası (React Hook Form + Zod)
[ ] lib/auth.ts → login, logout, getMe
[ ] AuthProvider → session context
[ ] Middleware: /dashboard/* rotaları login gerektirsin
[ ] Login sonrası /dashboard yönlendirme
```

---

**#10 — Event CRUD API**
`feat` `priority: critical` `scope: events`
`Branch: feature/event-crud-api`

```
[ ] EventsModule, EventsService, EventsController, EventsRepository
[ ] POST   /events → yeni etkinlik oluştur
[ ] GET    /events → liste (pagination)
[ ] GET    /events/:id → detay
[ ] PATCH  /events/:id → güncelle
[ ] DELETE /events/:id → sil (soft delete)
[ ] CreateEventDto (class-validator)
[ ] UpdateEventDto
[ ] Swagger decorator'ları
[ ] Unit test: EventsService
```

---

**#11 — Session CRUD API**
`feat` `priority: high` `scope: events`
`Branch: feature/session-crud-api`

```
[ ] SessionsModule, SessionsService, SessionsController
[ ] POST /events/:id/sessions
[ ] GET  /events/:id/sessions
[ ] PATCH /events/:eventId/sessions/:sessionId
[ ] DELETE /events/:eventId/sessions/:sessionId
[ ] CreateSessionDto
[ ] Unit test: SessionsService
```

---

**#12 — Admin event yönetim UI**
`feat` `priority: critical` `scope: ui`
`Branch: feature/admin-event-ui`

```
[ ] /dashboard → event listesi sayfası
      EventCard bileşeni (başlık, tarih, durum, katılımcı sayısı)
      "Yeni Etkinlik" butonu
[ ] /events/new → yeni etkinlik formu
      ad, açıklama, konum adı
      harita veya lat/lng manuel giriş
      radius slider (50m - 500m)
      tarih-saat seçici
[ ] /events/[id] → etkinlik detay sayfası
      sekmeler: Genel Bilgi | Oturumlar | Katılımcılar | QR | Katılım | Export
[ ] /events/[id] Oturumlar sekmesi
      session listesi
      yeni session ekleme formu (inline veya modal)
[ ] Responsive: tablet + mobile uyumlu
[ ] Skeleton loading state'leri
[ ] Toast bildirimleri (başarı / hata)
```

---

## Sprint 2 — Katılımcılar & QR
> **Süre:** 3 gün
> **Base branch (solo):** `develop`

### Issues

---

**#13 — Veritabanı şeması: participants + qr_nonces**
`feat` `priority: critical` `scope: db`
`Branch: feature/db-schema-participants`

```
[ ] packages/db/src/schema/participants.ts
      id, event_id, name, email, phone,
      source (csv|manual|self_registered),
      external_id, created_at
[ ] packages/db/src/schema/index.ts güncelle
[ ] Drizzle migration üret + uygula
[ ] Unique index: (email, event_id)
[ ] packages/shared/src/types/participant.ts
```

---

**#14 — Participant API: manuel ekleme + CSV import**
`feat` `priority: critical` `scope: participants`
`Branch: feature/participant-management-api`

```
[ ] ParticipantsModule, Service, Controller, Repository
[ ] POST /events/:id/participants/manual
      body: { name, email, phone }
[ ] GET  /events/:id/participants
      pagination, arama filtresi
[ ] DELETE /events/:id/participants/:pid

CSV Import:
[ ] POST /events/:id/participants/import-csv → multipart
[ ] Multer middleware (geçici dosya upload)
[ ] Papaparse ile CSV parse
[ ] Validation: her satır name zorunlu, email format
[ ] Toplu insert (conflict = skip/update)
[ ] Import sonucu dön: { total, success, failed, errors[] }

[ ] Unit test: CSV parse + validation
```

---

**#15 — Participant UI: liste + CSV upload + manuel ekleme**
`feat` `priority: critical` `scope: ui`
`Branch: feature/participant-ui`

```
[ ] /events/[id] Katılımcılar sekmesi:
      TanStack Table: ad, email, telefon, kaynak, tarih
      Arama / filtre satırı
      "Manuel Ekle" butonu → modal form
      "CSV Yükle" butonu → drag-drop + file input
      CSV template indirme linki
      Upload progress göstergesi
      Import sonucu özeti (başarı/hata sayısı)
      Başarısız satırlar accordion ile göster
      Katılımcı silme (confirm dialog)
```

---

**#16 — QR token servisi**
`feat` `priority: critical` `scope: qr`
`Branch: feature/qr-token-service`

```
Backend:
[ ] QRModule, QRTokenService
[ ] generateToken(sessionId, rotationSec): string
      payload: { v, sid, tw, nonce, sig }
      HMAC-SHA256 imza (QR_SECRET)
      base64url encode
[ ] verifyToken(raw): QRVerificationResult
      imza doğrulama
      time window kontrolü (±1 window tolerans)
      Redis nonce blacklist kontrolü
      kullanılan nonce'u Redis'e yaz (TTL: rotationSec * 2)
[ ] GET /events/:eventId/qr/current
      aktif session için token üret
      { token, expiresIn, sessionId }
[ ] Unit test:
      geçerli token → valid
      süresi dolmuş token → EXPIRED_TOKEN
      geçersiz imza → INVALID_SIGNATURE
      tekrar kullanım → REPLAY_ATTACK
      clock skew tolerans → valid

Redis:
[ ] packages/shared/src/redis.ts → Upstash bağlantısı
[ ] Nonce key format: qr:nonce:{sessionId}:{nonce}
```

---

**#17 — Admin QR display ekranı**
`feat` `priority: critical` `scope: ui`
`Branch: feature/admin-qr-display`

```
[ ] /events/[id] QR sekmesi:
      QRCodeSVG (qrcode.react) → token değerini göster
      Büyük, net, taranabilir boyut (min 250x250px)
      Countdown timer: "Yenileniyor: 45s"
      Timer progress bar (kırmızıya yaklaşınca uyarı)
      setInterval ile token yenileme (rotationSec * 1000)
      Tam ekran modu (sunum için)
      "QR'ı İndir" butonu (PNG)
[ ] Mobil uyumlu: telefonu yatay tutunca büyüsün
[ ] Loading state (token çekilirken spinner)
[ ] Error state (network hatası → retry butonu)
```

---

## Sprint 3 — Scan Akışı & Konum Doğrulama
> **Süre:** 3 gün
> **Base branch (solo):** `develop`

### Issues

---

**#18 — Veritabanı şeması: attendance_records + attendance_attempts**
`feat` `priority: critical` `scope: db`
`Branch: feature/db-schema-attendance`

```
[ ] packages/db/src/schema/attendance_records.ts
      id, event_id, session_id, participant_id (nullable),
      full_name, email, phone,
      scanned_at, latitude, longitude, accuracy,
      distance_from_venue, is_valid, invalid_reason,
      qr_nonce, ip_address, device_fingerprint, created_at
      Unique: (participant_id, session_id) — kayıtlı katılımcı için
[ ] packages/db/src/schema/attendance_attempts.ts
      id, session_id, ip, user_agent,
      latitude, longitude, scanned_at,
      result (success|failed), reason, created_at
[ ] Drizzle migration üret + uygula
[ ] packages/shared/src/types/attendance.ts
```

---

**#19 — Konum doğrulama utility**
`feat` `priority: critical` `scope: location`
`Branch: feature/location-validation`

```
[ ] packages/shared/src/utils/geofence.ts
      haversine(a, b): number → metre cinsinden mesafe
      validateLocation(params): LocationResult
        mesafe <= radius → valid
        accuracy kötüyse (>200m) → LOW_ACCURACY flag
        mesafe - accuracy <= radius → toleranslı kabul
        mesafe > radius → invalid, LOCATION_OUT_OF_RANGE
[ ] LocationResult tipi:
      { valid: boolean, distance: number, flags: string[], reason?: string }
[ ] Unit test:
      mesafe içinde → valid
      mesafe dışında → invalid + LOCATION_OUT_OF_RANGE
      accuracy kötü ama mesafe içinde → valid + LOW_ACCURACY flag
      konum verisi yok → invalid + NO_LOCATION_DATA
```

---

**#20 — Attendance scan API**
`feat` `priority: critical` `scope: attendance`
`Branch: feature/attendance-scan-api`

```
[ ] AttendanceModule, AttendanceService, AttendanceController
[ ] POST /attendance/scan
      @Throttle: 10 req/dakika/IP

      Body: ScanDto
        token: string          (zorunlu)
        lat?: number
        lng?: number
        locationAccuracy?: number
        email?: string
        name?: string          (walk-in için)
        phone?: string         (walk-in için)
        fingerprint?: string

      Akış:
        1. QR token doğrula
        2. Session bul (aktif mi?)
        3. Konum doğrula (session.locationLat varsa)
        4. email ile participant ara
        5. Yoksa → name zorunlu → { action: 'REGISTRATION_REQUIRED' }
        6. Walk-in → yeni participant yaz (source: self_registered)
        7. Duplicate kontrol
        8. attendance_record yaz
        9. attendance_attempt yaz (her halükarda)
        10. { success: true, participant: { name } }

      Hata kodları:
        MALFORMED_TOKEN
        EXPIRED_TOKEN
        INVALID_SIGNATURE
        REPLAY_ATTACK
        SESSION_NOT_FOUND
        SESSION_INACTIVE
        LOCATION_OUT_OF_RANGE
        NO_LOCATION_DATA
        ALREADY_CHECKED_IN
        REGISTRATION_REQUIRED

[ ] Unit test: her hata senaryosu için ayrı test
[ ] Integration test: tam happy path
```

---

**#21 — Scan PWA frontend**
`feat` `priority: critical` `scope: ui`
`Branch: feature/scan-pwa`

```
[ ] /scan → public route (auth gerekmez)
      Büyük "QR Tara" başlığı
      Kamera izni açıklaması
      Konum izni açıklaması
      "Taramaya Başla" butonu

[ ] /check-in/[eventId] → kamera ekranı
      BarcodeDetector API kullan (destekliyorsa)
      Fallback: html5-qrcode veya @zxing/library
      Kamera preview (fullscreen mobil)
      Tarama sonrası otomatik process
      Overlay: yeşil kare (başarılı okuma animasyonu)
      Konum alma: navigator.geolocation.getCurrentPosition
        timeout: 10s
        maximumAge: 30s
        enableHighAccuracy: true

[ ] /check-in/[eventId]/guest-form → walk-in formu
      Ad Soyad (zorunlu)
      E-posta (opsiyonel)
      Telefon (opsiyonel, email yoksa zorunlu)
      "Katılımı Onayla" butonu
      Form submit → POST /attendance/scan (token session'da saklı)

[ ] /check-in/result → sonuç ekranı
      Başarı: büyük yeşil ✓, katılımcı adı, etkinlik adı
      Hata durumları (ayrı görsel stil):
        QR Süresi Dolmuş → "Yeni QR için organizatörle iletişime geçin"
        Konum Uygun Değil → "Etkinlik alanında olmak gerekiyor"
        Zaten Katıldınız → "Daha önce katılım kaydedildi"
        Etkinlik Bulunamadı → "Geçersiz QR kodu"

[ ] Meta tags: viewport, theme-color, manifest.json (PWA)
[ ] iOS Safari kamera uyumu test
[ ] Android Chrome kamera uyumu test
```

---

## Sprint 4 — Attendance Paneli & Export
> **Süre:** 2 gün
> **Base branch (solo):** `develop`

### Issues

---

**#22 — Attendance listesi API**
`feat` `priority: critical` `scope: attendance`
`Branch: feature/attendance-list-api`

```
[ ] GET /events/:id/attendance
      query params: sessionId?, page, limit, search, isValid
      Response: { data: AttendanceRecord[], total, page }
[ ] PATCH /attendance/:id/manual-status
      Body: { isValid: boolean, reason?: string }
      → Admin manuel var/yok düzeltmesi
[ ] GET /events/:id/attendance/stats
      { total, valid, invalid, walkIn, registered }
[ ] Unit test: pagination + filtre
```

---

**#23 — Attendance paneli UI**
`feat` `priority: critical` `scope: ui`
`Branch: feature/attendance-panel-ui`

```
[ ] /events/[id] Katılım sekmesi:
      Üst özet kartları:
        Toplam Katılım | Geçerli | Geçersiz | Walk-in
      TanStack Table:
        Ad Soyad, E-posta, Telefon,
        Katılım Saati, Konum (✓/✗), Kayıt Türü
      Filtre: Geçerli / Geçersiz / Tümü
      Arama: ad veya email
      Her satırda: Manuel Düzelt butonu (toggle var/yok)
      Onay dialog: "Bu kaydı geçersiz yapmak istediğinize emin misiniz?"
      Son eklenen kayıt üstte (scanned_at DESC)
      Sayfalama

[ ] TanStack Query: 30 saniyede bir refetch (polling)
      → Admin "canlı" görünüm için socket.io şart değil
      → refetchInterval: 30_000

[ ] Skeleton loading
[ ] Empty state: "Henüz katılım kaydı yok"
```

---

**#24 — Excel export (async)**
`feat` `priority: critical` `scope: export`
`Branch: feature/excel-export`

```
[ ] packages/db/src/schema/exports.ts
    (Sprint 0'da yoksa ekle)
[ ] Drizzle migration

Backend (api):
[ ] ExportsModule, ExportsService, ExportsController
[ ] POST /events/:id/attendance/export
      → exports tablosuna pending kayıt oluştur
      → BullMQ export.queue'ya job ekle
      → { exportId, message: 'Hazırlanıyor...' }
[ ] GET /exports/:id/status
      → { status: pending|processing|ready|failed, downloadUrl? }

Worker (apps/worker):
[ ] ExportProcessor (@Process('attendance-excel'))
      1. attendance_records çek (tüm kayıtlar)
      2. xlsx (SheetJS) ile Excel üret:
           Sütunlar: Ad Soyad, E-posta, Telefon,
                     Katılım Tarihi, Katılım Saati,
                     Konum Geçerli, Mesafe (m), Kayıt Türü
           Başlık satırı bold + arka plan rengi
           Tarih formatı: DD.MM.YYYY HH:mm
      3. R2/S3'e yükle: exports/{eventId}/{timestamp}.xlsx
      4. exports tablosunu güncelle: status=ready, file_url
      5. (opsiyonel) admin'e email gönder

Frontend:
[ ] Export butonu → POST → exportId al
[ ] Polling: GET /exports/:id/status her 3s
[ ] Durum göstergesi: "Hazırlanıyor..." → "İndir" (progress bar)
[ ] İndir butonuna tıklayınca signed URL ile download
[ ] Hata durumu: "Export başarısız, tekrar dene"
```

---

**#25 — Admin event sayfası: manuel var/yok**
`feat` `priority: high` `scope: ui`
`Branch: feature/manual-attendance`

```
[ ] Admin katılımcı listesinde her satır için:
      Var / Yok toggle (checkbox veya switch)
      Kayıt yoksa "Var İşaretle" → yeni attendance_record oluştur
      Kayıt varsa toggle ile is_valid güncelle
[ ] Bulk işlem: seçili katılımcıları "Var" işaretle
[ ] Confirm dialog kullanıcıdan onay al
```

---

## Sprint 5 — Hata Yönetimi & Polish
> **Süre:** 2 gün
> **Base branch (solo):** `develop`

### Issues

---

**#26 — Error handling: tam senaryo kapsamı**
`feat` `priority: high`
`Branch: feature/error-handling`

```
Backend:
[ ] GlobalExceptionFilter → tüm hataları standart forma dönüştür
    { success: false, code: string, message: string, statusCode: number }
[ ] QR hataları: 400 + özel kod
[ ] Konum hataları: 400 + özel kod
[ ] Auth hataları: 401/403
[ ] Not found: 404
[ ] Throttle: 429 + Retry-After header
[ ] Unhandled: 500 + Sentry capture

Frontend:
[ ] lib/api.ts hata tipi parse → typed error handling
[ ] Her hata kodu için Türkçe kullanıcı mesajı map'i:
    EXPIRED_TOKEN        → "QR kodun süresi dolmuş. Yeni kodu tarayın."
    INVALID_SIGNATURE    → "Geçersiz QR kodu."
    REPLAY_ATTACK        → "Bu QR zaten kullanılmış."
    SESSION_NOT_FOUND    → "Etkinlik bulunamadı."
    SESSION_INACTIVE     → "Bu oturum henüz başlamadı veya sona erdi."
    LOCATION_OUT_OF_RANGE → "Etkinlik alanının dışındasınız."
    NO_LOCATION_DATA     → "Konum bilgisi alınamadı. İzin verip tekrar deneyin."
    ALREADY_CHECKED_IN   → "Bu etkinliğe zaten katıldınız."
[ ] Network hatası → "Bağlantı sorunu. İnternet bağlantınızı kontrol edin."
[ ] Scan ekranı: her hata kodu için farklı ikon + renk
```

---

**#27 — Responsive & mobil uyum**
`feat` `priority: high` `scope: ui`
`Branch: feature/responsive-polish`

```
[ ] Admin paneli mobil breakpoint'leri:
      Sidebar → hamburger menü (md altında)
      Tablolar → yatay scroll
      Formlar → tek sütun (sm altında)
[ ] QR display:
      Telefon yatay → QR tam ekran
      Tablet → yan yana QR + countdown
[ ] Scan ekranı:
      Kamera fullscreen mobilde
      Butonlar thumb-friendly (min 44px)
      Form → büyük input alanları
[ ] iOS Safari test:
      Kamera izni akışı
      Geolocation izni akışı
      httpOnly cookie davranışı
[ ] Android Chrome test:
      BarcodeDetector API var mı kontrol
      Fallback kütüphane tetikleme
```

---

**#28 — Loading, skeleton ve empty state'ler**
`chore` `priority: medium` `scope: ui`
`Branch: feature/loading-states`

```
[ ] EventListPage skeleton (3 kart)
[ ] ParticipantTable skeleton (5 satır)
[ ] AttendanceTable skeleton (5 satır)
[ ] QR Display loading spinner
[ ] Export status inline spinner
[ ] Empty state bileşeni (ikon + mesaj + CTA):
      Etkinlik yok → "Henüz etkinlik oluşturmadınız" + "Oluştur" butonu
      Katılımcı yok → "CSV yükleyin veya manuel ekleyin"
      Katılım yok → "Henüz QR taraması yapılmadı"
```

---

**#29 — Audit log**
`feat` `priority: medium` `scope: auth`
`Branch: feature/audit-log`

```
[ ] packages/db/src/schema/audit_logs.ts
      id, admin_id, action, entity_type, entity_id, metadata_json, created_at
[ ] AuditInterceptor → controller method'lardan otomatik log
[ ] Loglanan aksiyonlar:
      admin.login, admin.logout
      event.created, event.updated, event.deleted
      participant.imported, participant.added
      attendance.manual_override
      export.requested, export.completed
[ ] GET /audit → admin listesi (son 100 kayıt)
[ ] UI: /dashboard/audit → basit liste görünümü
```

---

**#30 — Demo hazırlığı**
`chore` `priority: high`
`Branch: chore/demo-prep`

```
[ ] Seed script: demo etkinlik + session + 20 katılımcı
    pnpm db:seed
[ ] .env.example güncel ve açıklamalı
[ ] README.md:
      Proje açıklaması
      Kurulum adımları (pnpm install, db:migrate, db:seed, dev)
      Mimari özeti
      API dökümantasyon linki (Swagger)
      Deploy bilgisi
[ ] Swagger UI: /api/docs erişilebilir
[ ] Vercel preview URL hazır
[ ] Demo admin credentials .env'de sabit
[ ] Demo senaryosu için 2 QR akışı test et:
      Kayıtlı katılımcı happy path
      Walk-in katılımcı happy path
```

---

## Geliştirme Sırası (Günlük Plan)

```
Gün 1  → Sprint 0 tamamen (#1-#7)
Gün 2  → #8 (DB schema) + #9 (Auth)
Gün 3  → #10 (Event API) + #11 (Session API) + #12 (Event UI başlangıç)
Gün 4  → #12 tamamla + #13 (DB participants) + #14 (Participant API)
Gün 5  → #15 (Participant UI) + #16 (QR token servisi)
Gün 6  → #17 (QR display UI) + #18 (DB attendance) + #19 (Location util)
Gün 7  → #20 (Attendance scan API)
Gün 8  → #21 (Scan PWA frontend)
Gün 9  → #22 (Attendance list API) + #23 (Attendance panel UI)
Gün 10 → #24 (Excel export)
Gün 11 → #25 (Manuel var/yok) + #26 (Error handling)
Gün 12 → #27 (Responsive) + #28 (Loading states) + #29 (Audit log)
Gün 13 → #30 (Demo prep) + son testler + deploy doğrulama
```

---

## PR Şablonu (release için önerilen)

`.github/pull_request_template.md`:

```markdown
## Ne yaptım?
<!-- Kısa açıklama -->

## Release nedeni
<!-- Neden main'e çıkmaya hazır? -->

## İlgili Issue (opsiyonel)
Closes #

## Kontrol listesi
- [ ] pnpm lint geçti
- [ ] pnpm build geçti
- [ ] pnpm test geçti
- [ ] develop → main diff gözden geçirildi

## Ekran görüntüsü (UI değişikliği varsa)
```

---

## Milestone Yapısı

```
Milestone 1: Core Infrastructure
  #1 #2 #3 #4 #5 #6 #7

Milestone 2: Event & Auth
  #8 #9 #10 #11 #12

Milestone 3: Participants & QR
  #13 #14 #15 #16 #17

Milestone 4: Scan & Attendance
  #18 #19 #20 #21 #22 #23

Milestone 5: Export & Polish
  #24 #25 #26 #27 #28 #29 #30
```
