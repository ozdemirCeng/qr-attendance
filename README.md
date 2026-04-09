# QR Attendance

QR kod tabanli yoklama ve katilim takibi icin gelistirilen tam yigin monorepo proje.

## Proje Ozeti

Uygulama iki ana akis uzerine kurulur:

- Admin paneli: Etkinlik olusturma, katilimci yonetimi, QR uretimi, katilim raporlari ve audit kayitlari
- Katilimci akisi: Mobil cihaz ile QR okutma, konum kontrolu ve katilim kaydi

## Mimari

- Monorepo: Turborepo + pnpm
- Web: Next.js App Router (`apps/web`)
- API: NestJS (`apps/api`)
- Worker: NestJS + BullMQ (`apps/worker`)
- Veritabani: Neon Postgres + Drizzle ORM (`packages/db`)
- Ortak tipler: `packages/shared`

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

## Kurulum

1. Node.js 20.x kullanin.
2. Ortam degiskenlerini hazirlayin.
3. Bagimliliklari yukleyin.
4. Veritabani migration ve demo seed adimlarini calistirin.
5. Uygulamayi gelistirme modunda baslatin.

```bash
nvm use
pnpm install
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Yerel gelistirme notu:

- `NEXT_PUBLIC_API_URL` degerini yerelde `http://localhost:3001` olarak kullanin.
- `localhost:3000` (veya dev server'in actigi port) uzerinden web arayuzunu acin.

## Demo Seed

`pnpm db:seed` komutu asagidaki demo verisini idempotent olarak olusturur:

- 1 demo admin
- 1 demo etkinlik
- 1 demo oturum
- 20 demo katilimci

Demo kimlik bilgileri `.env.example` dosyasinda sabittir:

- `DEMO_ADMIN_USERNAME`
- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`

Giris akisinda email veya kullanici adi kullanilabilir. Neon Auth erisilemediginde demo hesapla yerel fallback oturum acma desteklenir.

## API Dokumantasyonu (Swagger)

- `http://localhost:3001/api/docs`
- Geri uyumluluk icin: `http://localhost:3001/docs`

## Deploy

- Web: Vercel (preview + production)
- API/Worker: Railway
- Veritabani: Neon

Not: Export akisi API icinde `.xlsx` dosyasi olusturur. Worker/Redis altyapisi olmadan da temel export kullanimi calisir.

Vercel preview URL alani:

- `https://<vercel-preview-url>`

Vercel env template dosyalari:

- API project (`apps/api`): `.env.vercel.api.example`
- Web project (`apps/web`): `.env.vercel.web.example`

Yerel hazir Vercel env dosyalari (gitignore):

- API: `.env.vercel.api`
- Web: `.env.vercel.web`

## Demo Akisi Kontrol Listesi

1. Kayitli katilimci happy path:
	 QR okut, konum izni ver, katilim kaydinin olustugunu `Katilim` sekmesinde dogrula.
2. Walk-in katilimci happy path:
	 Kayitsiz kullanici ile QR okut, formu doldur, katilim kaydinin olustugunu dogrula.

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