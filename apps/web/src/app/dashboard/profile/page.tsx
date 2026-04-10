"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/providers/auth-provider";

export default function AdminProfilePage() {
  const { user } = useAuth();

  return (
    <AppShell>
      <section className="mx-auto max-w-lg space-y-6">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Yonetim
          </p>
          <h1
            className="mt-1 text-2xl font-extrabold"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Admin Profili
          </h1>
        </div>

        <div className="glass-elevated animate-scale-in rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl text-2xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <span className="text-xl font-bold text-white">
                {user?.name?.charAt(0)?.toUpperCase() ?? "A"}
              </span>
            </div>
            <div className="min-w-0">
              <p
                className="truncate text-xl font-bold"
                style={{ color: "var(--text-primary)" }}
              >
                {user?.name ?? "Admin"}
              </p>
              <p
                className="truncate text-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {user?.email ?? "-"}
              </p>
              <span
                className="mt-1 inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: "var(--surface-soft)",
                  color: "var(--primary)",
                }}
              >
                {user?.role ?? "admin"}
              </span>
            </div>
          </div>
        </div>

        <article className="glass rounded-2xl p-6">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Hesap Bilgileri
          </h2>
          <div className="mt-4 space-y-4">
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Ad Soyad
              </label>
              <div
                className="glass-input w-full cursor-not-allowed opacity-70"
                style={{ padding: "0.625rem 0.875rem" }}
              >
                {user?.name ?? "-"}
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                E-posta
              </label>
              <div
                className="glass-input w-full cursor-not-allowed opacity-70"
                style={{ padding: "0.625rem 0.875rem" }}
              >
                {user?.email ?? "-"}
              </div>
            </div>
            <div className="space-y-1.5">
              <label
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Rol
              </label>
              <div
                className="glass-input w-full cursor-not-allowed opacity-70"
                style={{ padding: "0.625rem 0.875rem" }}
              >
                {user?.role === "admin"
                  ? "Yonetici"
                  : user?.role === "editor"
                    ? "Editor"
                    : user?.role ?? "-"}
              </div>
            </div>
          </div>
        </article>

        <div
          className="rounded-xl p-4"
          style={{ background: "var(--surface-soft)" }}
        >
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Admin hesap bilgileri sistem tarafindan yonetilir. Profil
            duzenlemek icin sistem yoneticisine basvurun.
          </p>
        </div>

        <article className="glass rounded-2xl p-6">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Oturum Bilgisi
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Oturum Tipi
              </p>
              <p
                className="mt-0.5 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Demo / Yerel
              </p>
            </div>
            <div>
              <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                Sure
              </p>
              <p
                className="mt-0.5 text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                24 saat
              </p>
            </div>
          </div>
        </article>
      </section>
    </AppShell>
  );
}
