# QR Attendance

QR kod tabanli yoklama ve katilim takibi icin gelistirilmis tam yigin (full-stack) monorepo proje.

## CANLI LINK

# [https://qr-attendance-web-dw44.vercel.app/](https://qr-attendance-web-dw44.vercel.app/)

## Proje Ozeti

Uygulama iki ana akis uzerine kuruludur:

- Admin paneli: Etkinlik olusturma, oturum yonetimi, katilimci yonetimi, QR uretimi, katilim raporlari, audit kayitlari
- Katilimci akisi: Mobil cihazla QR okutma, konum kontrolu, kimlik dogrulama, katilim kaydi

Onemli not:

- Check-in akisinda kullanici etkinlik secmek zorunda degildir. Etkinlik/oturum bilgisi QR icerisindeki imzali token'dan cozulur.

## Ekran Goruntuleri

### 1) Giris ve Katilimci Akisi

![Giris ekrani](<images/Ekran görüntüsü 2026-04-11 001451.png>)

![Kullanici paneli](<images/Ekran görüntüsü 2026-04-11 001513.png>)

![QR tarama ekrani](<images/Ekran görüntüsü 2026-04-11 001524.png>)

### 2) Yonetim Paneli ve Denetim

![Admin paneli](<images/Ekran görüntüsü 2026-04-11 001550.png>)

![Denetim kayitlari](<images/Ekran görüntüsü 2026-04-11 001648.png>)

### 3) Etkinlik Yonetimi

![Yeni etkinlik olusturma formu](<images/Ekran görüntüsü 2026-04-11 001708.png>)

![Etkinlik detayi ve canli QR](<images/Ekran görüntüsü 2026-04-11 001929.png>)

## Mimari

- Monorepo: Turborepo + pnpm
- Web: Next.js App Router (`apps/web`)
- API: NestJS (`apps/api`)
- Worker: NestJS + BullMQ (`apps/worker`)
- Veritabani: Neon Postgres + Drizzle ORM (`packages/db`)
- Ortak tipler ve yardimci kodlar: `packages/shared`

## Kullanilan Yontemler

- QR dogrulama: Imzali token + sure penceresi (rotation window)
- Replay korumasi: Nonce tek kullanim dogrulamasi (Redis veya fallback in-memory)
- Kisa kod destegi: Uzun token yerine insan dostu kisa dogrulama kodu ile scan
- Konum dogrulamasi: Etkinlik merkezi + yaricap (meter) kontrolu
- Kimlik akisi: Kayitli katilimci ve walk-in (misafir formu) akislari
- API hata standardizasyonu: Merkezi exception filter ile tutarli hata kodlari
- Same-origin proxy: Web tarafinda `/api/backend/*` ile backend proxy

## Teknoloji ve Kutuphaneler

Web (`apps/web`):

- Next.js 16, React 19
- @tanstack/react-query
- @tanstack/react-table
- react-hook-form
- zod
- @zxing/library
- qrcode.react

API (`apps/api`):

- NestJS 11
- class-validator + class-transformer
- @nestjs/swagger
- @nestjs/throttler
- @neondatabase/serverless
- ioredis
- bullmq
- xlsx
- @sentry/node

Worker (`apps/worker`):

- NestJS 11
- bullmq
- ioredis
- xlsx

DB (`packages/db`):

- drizzle-orm
- drizzle-kit
- @neondatabase/serverless

## Klasor Yapisi

```text
qr-attendance/
  apps/
	 api/
	 web/
	 worker/
  packages/
	 config/
	 db/
	 shared/
	 ui/
```

## Gereksinimler

- Node.js 20.x
- pnpm 10.x
- Neon Postgres baglantisi (`DATABASE_URL`)
- (Opsiyonel) Redis (`REDIS_URL`) - queue/nonce icin

## Kurulum ve Calistirma

### 1) Ortam degiskenleri

Repo kokunde `.env` dosyasi olusturun:

```bash
cp .env.example .env
```

Asgari zorunlu alanlar:

- `DATABASE_URL`
- `QR_SECRET`

Yaygin alanlar:

- `API_PORT` (varsayilan 3001)
- `CORS_ORIGIN`
- `NEXT_PUBLIC_API_URL` veya `API_INTERNAL_URL`
- `AUTH_COOKIE_NAME` (web ve api ayni olmali)

Opsiyonel alanlar:

- `REDIS_URL`
- `SENTRY_DSN`
- `NEON_AUTH_BASE_URL`

### 2) Bagimliliklar

```bash
pnpm install
```

### 3) Veritabani migration + seed

```bash
pnpm db:migrate
pnpm db:seed
```

### 4) Gelistirme modunda calistirma

Tum monorepo:

```bash
pnpm dev
```

Sadece API + Web (worker olmadan, yerelde daha stabil):

```bash
pnpm --filter @qr-attendance/api dev
$env:NEXT_PUBLIC_API_URL='http://localhost:3001'; pnpm --filter @qr-attendance/web dev
```

Arayuz:

- Web: `http://localhost:3000`
- API: `http://localhost:3001`
- Swagger: `http://localhost:3001/api/docs` (geri uyumluluk: `/docs`)

## NPM/PNPM Script Ozetleri

Repo koku:

- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm test`
- `pnpm typecheck`
- `pnpm quality`
- `pnpm db:migrate`
- `pnpm db:seed`

Paket bazli:

- API: `pnpm --filter @qr-attendance/api dev`
- Web: `pnpm --filter @qr-attendance/web dev`
- Worker: `pnpm --filter @qr-attendance/worker dev`

## Demo Seed ve Giris

`pnpm db:seed` idempotent olarak olusturur:

- 1 demo admin
- 1 demo etkinlik
- 1 demo oturum
- 20 demo katilimci

Demo kimlik bilgileri:

- `DEMO_ADMIN_USERNAME`
- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`

Giris akisinda email veya kullanici adi kullanilabilir. Neon Auth yoksa demo fallback session acma devrededir.

## Deploy Notlari

- Web: Vercel (preview + production)
- API/Worker: Railway
- Veritabani: Neon

Vercel env template dosyalari:

- API: `.env.vercel.api.example`
- Web: `.env.vercel.web.example`

Yerelde Vercel import icin hazir dosyalar (gitignore):

- API: `.env.vercel.api`
- Web: `.env.vercel.web`

Web tarafinda onerilen env:

- `API_INTERNAL_URL`
- `NEXT_PUBLIC_API_URL`
- `AUTH_COOKIE_NAME`

## Demo Akisi Kontrol Listesi

1. Kayitli katilimci senaryosu:
	QR okut -> kimlik dogrula -> `Katilim` sekmesinde kaydi gor.
2. Walk-in senaryosu:
	QR okut -> `REGISTRATION_REQUIRED` durumunda misafir formunu doldur -> katilim kaydini gor.

## Sık Karsilasilan Sorunlar

### 1) `ERR_CONTENT_DECODING_FAILED`

- Web proxy response basliklariyla ilgili olabilir.
- Web deployunu cache temizleyerek tekrar alin.

### 2) Session olusturmada `400 Bad Request`

- Oturum zamani etkinlik zaman araligi disinda olabilir.
- Baslangic/bitis tarihlerini etkinlik penceresi icine alin.

### 3) `EADDRINUSE: 3001`

- API portu baska process tarafindan kullaniliyor.
- Portu bosaltip yeniden baslatin veya `API_PORT` degistirin.

### 4) CI job baslamiyor (billing lock)

- Koddan bagimsizdir. Platform (GitHub/Vercel) billing problemi cozulmeden job baslamaz.

## Kalite Komutlari

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tek komut:

```bash
pnpm quality
```

## Ek Dokuman

- Gelistirme kurallari: `CONTRIBUTING.md`
