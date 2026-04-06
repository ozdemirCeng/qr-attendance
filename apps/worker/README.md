# Worker Uygulamasi

Bu paket asenkron isleri kuyruk uzerinden calistirir.

## Sorumluluklar

- Export queue islemleri
- Import queue islemleri
- Uzun sureli arka plan gorevleri

## Gelistirme Komutlari

```bash
pnpm --filter @qr-attendance/worker dev
pnpm --filter @qr-attendance/worker build
pnpm --filter @qr-attendance/worker test
pnpm --filter @qr-attendance/worker typecheck
```

## Teknik Notlar

- BullMQ ve ioredis kullanilir.
- REDIS_URL konfigurasyonu zorunludur.
