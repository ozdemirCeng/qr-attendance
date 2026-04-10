import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function ForgotPasswordPage() {

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <section className="glass-elevated w-full max-w-3xl animate-scale-in rounded-[2rem] p-8 md:p-10">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.2em]"
          style={{ color: "var(--primary)" }}
        >
          Hesap Yardimi
        </p>
        <h1
          className="mt-3 text-3xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
          data-display="true"
        >
          Sifre yardimi
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Bu projede otomatik e-posta sifre sifirlama akisi yok. Tek giris
          modeli kullanilir; admin ve uye hesaplari ayni ekrandan oturum acar.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="glass rounded-2xl p-5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Uye Hesabi
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Oturumun aciksa <Link href="/user/profile" className="font-semibold" style={{ color: "var(--primary)" }}>profil</Link> ekranindan sifreni degistirebilirsin. Oturumun yoksa etkinlik yoneticisi ile iletisime gecmen gerekir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login" className="btn-primary text-sm">
                Giris Ekrani
              </Link>
              <Link href="/auth/signup" className="btn-secondary text-sm">
                Yeni Hesap Ac
              </Link>
            </div>
          </article>

          <article className="glass rounded-2xl p-5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Yonetici Hesabi
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Yonetici sifreleri sistem yoneticisi tarafindan yonetilir. Yerel
              demo kurulumu kullaniyorsan ayni giris ekranindan demo admin
              kimligi ile oturum acabilirsin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login" className="btn-primary text-sm">
                Tek Giris Ekrani
              </Link>
              <Link href="/scan" className="btn-secondary text-sm">
                QR Tara
              </Link>
            </div>
          </article>
        </div>

        <div
          className="mt-6 rounded-2xl p-4"
          style={{ background: "var(--surface-soft)" }}
        >
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Uye hesaplari profil ekranindan kendi bilgilerini ve parolalarini
            gunceller. Admin hesaplari ise tek giris uzerinden admin paneline
            yonlendirilir.
          </p>
        </div>
      </section>
    </main>
  );
}
