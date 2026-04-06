# QR Attendance

QR kod ile yoklama ve katilim takibi icin gelistirilen monorepo proje.

## Teknik Yapi

- Monorepo: Turborepo + pnpm
- Web: Next.js (apps/web)
- API: NestJS (apps/api)
- Worker: NestJS + BullMQ (apps/worker)
- Veritabani: Neon Postgres + Drizzle ORM (packages/db)

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

## Hizli Baslangic

```bash
nvm use
pnpm install
pnpm dev
```

Not: Proje Node.js 20.x ile calisir. Bu nedenle `.nvmrc` ve `.node-version`
dosyalari repoda tutulur.

## Ortam Degiskenleri

Temel degiskenler icin `.env.example` dosyasini baz alin.

## Kalite Akisi

Yerelde push oncesi asagidaki komutlari calistirin:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Tek komutla calistirmak icin:

```bash
pnpm quality
```

## Dokumanlar

- Gelistirme kurallari: CONTRIBUTING.md
- Sprint plani: QR_Yoklama_Proje_Plani.md
- Case metni: stajcase.md