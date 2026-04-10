# API Uygulamasi

Bu paket QR Attendance projesinin backend servisidir.

## Sorumluluklar

- Auth islemleri
- Event ve session yonetimi
- Katilim tarama ve dogrulama
- Export istekleri icin `.xlsx` dosyasi uretimi

## Gelistirme Komutlari

```bash
pnpm --filter @qr-attendance/api dev
pnpm --filter @qr-attendance/api build
pnpm --filter @qr-attendance/api test
pnpm --filter @qr-attendance/api typecheck
```

## Teknik Notlar

- ConfigModule global olarak aktif.
- Swagger endpoint: /api/docs
- Geri uyumluluk endpointi: /docs
- Health endpoint: /health
- Global validation ve exception filter kullanilir.
- Export endpointleri Redis varsa `export.queue` uzerinden worker'a is birakir.
- Redis yoksa export dosyasi API icinde uretilir.
- Vercel API env template: `.env.vercel.api.example` (repo root)
