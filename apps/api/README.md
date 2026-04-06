# API Uygulamasi

Bu paket QR Attendance projesinin backend servisidir.

## Sorumluluklar

- Auth islemleri
- Event ve session yonetimi
- Katilim tarama ve dogrulama
- Export isteklerinin kuyruga alinmasi

## Gelistirme Komutlari

```bash
pnpm --filter @qr-attendance/api dev
pnpm --filter @qr-attendance/api build
pnpm --filter @qr-attendance/api test
pnpm --filter @qr-attendance/api typecheck
```

## Teknik Notlar

- ConfigModule global olarak aktif.
- Swagger endpoint: /docs
- Health endpoint: /health
- Global validation ve exception filter kullanilir.
