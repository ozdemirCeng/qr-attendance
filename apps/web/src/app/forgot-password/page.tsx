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
          Hesap Yardımı
        </p>
        <h1
          className="mt-3 text-3xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
          data-display="true"
        >
          Şifre yardımı
        </h1>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Bu sürümde otomatik şifre sıfırlama e-postası yok. Admin ve kullanıcı
          hesapları aynı giriş ekranından oturum açar.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <article className="glass rounded-2xl p-5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Kullanıcı hesabı
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Oturumun açıksa{" "}
              <Link
                href="/user/profile"
                className="font-semibold"
                style={{ color: "var(--primary)" }}
              >
                profil
              </Link>{" "}
              ekranından şifreni değiştirebilirsin. Oturumun yoksa etkinlik
              yöneticisi ile iletişime geçmen gerekir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login" className="btn-primary text-sm">
                Giriş Ekranı
              </Link>
              <Link href="/auth/signup" className="btn-secondary text-sm">
                Yeni Hesap Aç
              </Link>
            </div>
          </article>

          <article className="glass rounded-2xl p-5">
            <p
              className="text-sm font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Admin hesabı
            </p>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Admin parolaları sistem yöneticisi tarafından yönetilir. Demo
              ortamındaysan aynı giriş ekranından demo admin bilgileri ile devam
              edebilirsin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/login" className="btn-primary text-sm">
                Tek Giriş
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
            Profil, parola ve etkinlik geçmişi kullanıcı panelinde; yönetim ve
            etkinlik işlemleri admin panelinde yer alır.
          </p>
        </div>
      </section>
    </main>
  );
}
