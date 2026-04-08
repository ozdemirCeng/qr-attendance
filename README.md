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

## Demo Seed

`pnpm db:seed` komutu asagidaki demo verisini idempotent olarak olusturur:

- 1 demo admin
- 1 demo etkinlik
- 1 demo oturum
- 20 demo katilimci

Demo kimlik bilgileri `.env.example` dosyasinda sabittir:

- `DEMO_ADMIN_EMAIL`
- `DEMO_ADMIN_PASSWORD`

Not: Giris akisinda Neon Auth kullanildigi icin ayni hesap Neon Auth tarafinda da tanimli olmalidir.

## API Dokumantasyonu (Swagger)

- `http://localhost:3001/api/docs`
- Geri uyumluluk icin: `http://localhost:3001/docs`

## Deploy

- Web: Vercel (preview + production)
- API/Worker: Railway
- Veritabani: Neon

Vercel preview URL alani:

- `https://<vercel-preview-url>`

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