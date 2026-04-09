# Web Uygulamasi

Bu paket admin paneli ve mobil tarama arayuzunu barindirir.

## Gelistirme Komutlari

```bash
pnpm --filter @qr-attendance/web dev
pnpm --filter @qr-attendance/web build
pnpm --filter @qr-attendance/web lint
pnpm --filter @qr-attendance/web typecheck
```

## Notlar

- Next.js App Router kullanilir.
- Veri cekme icin TanStack Query kullanilir.
- API baglantisi NEXT_PUBLIC_API_URL degiskeni ile yonetilir.
- Dev scripti `next dev --webpack` olarak calisir (Turbopack HMR chunk hatalarina karsi).
- Yerel gelistirmede NEXT_PUBLIC_API_URL degerini `http://localhost:3001` kullanin.
- Vercel Web env template: `.env.vercel.web.example` (repo root)
