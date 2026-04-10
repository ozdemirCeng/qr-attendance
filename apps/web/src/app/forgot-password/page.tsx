import Link from "next/link";

import { ThemeToggle } from "@/components/ui/theme-toggle";

type ForgotPasswordPageProps = {
  searchParams: {
    role?: string;
  };
};

export default function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const role = searchParams.role === "admin" ? "admin" : "participant";

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
          Bu projede otomatik e-posta sifre sifirlama akisi yok. Guvenlik icin
          sifre islemleri rol bazinda manuel yonetilir.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="glass rounded-2xl p-5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Katilimci Hesabi
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Daha once giris yaptiysan <Link href="/profile" className="font-semibold" style={{ color: "var(--primary)" }}>profil</Link> ekranindan sifreni degistirebilirsin. Oturumun yoksa etkinlik yoneticisi ile iletisime gecmen gerekir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/login?role=participant"
                className="btn-primary text-sm"
              >
                Katilimci Girisi
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
              demo kurulumu kullaniyorsan demo kimligi ile giris yapabilirsin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login?role=admin" className="btn-primary text-sm">
                Yonetici Girisi
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
            Su an secili rol:{" "}
            <span
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {role === "admin" ? "Yonetici" : "Katilimci"}
            </span>
          </p>
        </div>
      </section>
    </main>
  );
}
