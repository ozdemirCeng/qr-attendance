# Worker Uygulamasi

Bu paket asenkron isleri kuyruk uzerinden calistirir.

## Sorumluluklar

- Export queue islemleri
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
- Varsayilan Redis adresi `redis://127.0.0.1:6379` olarak kabul edilir.
- Aktif olarak sadece `export.queue` worker tarafinda islenir.
