"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AppShell } from "@/components/layout/app-shell";
import { ApiError } from "@/lib/api";
import { updateAdminProfile } from "@/lib/auth";
import { useAuth } from "@/providers/auth-provider";

type AdminProfileValues = {
  name: string;
  email: string;
};

function resolveRoleLabel(role: string | undefined) {
  if (role === "editor") {
    return "Editor";
  }

  return "Yonetici";
}

export default function AdminProfilePage() {
  const { user, refreshSession } = useAuth();
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const form = useForm<AdminProfileValues>({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  useEffect(() => {
    form.reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
    });
  }, [form, user]);

  async function onSubmit(values: AdminProfileValues) {
    setMessage(null);

    try {
      await updateAdminProfile({
        name: values.name.trim() || undefined,
        email: values.email.trim() || undefined,
      });
      await refreshSession();
      setMessage({
        type: "success",
        text: "Admin profili guncellendi.",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof ApiError
            ? error.message
            : "Profil guncellenirken bir hata olustu.",
      });
    }
  }

  return (
    <AppShell>
      <section className="mx-auto max-w-3xl space-y-6">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.2em]"
            style={{ color: "var(--text-secondary)" }}
          >
            Yonetim
          </p>
          <h1
            className="mt-1 text-3xl font-extrabold"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Admin Profili
          </h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Hesap bilgilerini buradan guncelleyebilir, yonetim oturumunu tek
            yerden takip edebilirsin.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <article className="glass-elevated animate-scale-in rounded-2xl p-6">
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
                  {resolveRoleLabel(user?.role)}
                </span>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div
                className="rounded-xl p-3"
                style={{ background: "var(--surface-soft)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Oturum Tipi
                </p>
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  Admin
                </p>
              </div>
              <div
                className="rounded-xl p-3"
                style={{ background: "var(--surface-soft)" }}
              >
                <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
                  Yetki
                </p>
                <p
                  className="mt-1 text-sm font-semibold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {resolveRoleLabel(user?.role)}
                </p>
              </div>
            </div>
          </article>

          <article className="glass rounded-2xl p-6">
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Hesap Bilgilerini Duzenle
            </h2>
            <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              Demo admin oturumunda ad ve e-posta bilgisini dogrudan
              guncelleyebilirsin. Dis servis ile yonetilen hesaplarda backend
              kisiti varsa hata mesaji burada gosterilir.
            </p>

            <form
              className="mt-5 space-y-4"
              onSubmit={form.handleSubmit((values) => {
                void onSubmit(values);
              })}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="adminName"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Ad Soyad
                </label>
                <input
                  id="adminName"
                  type="text"
                  autoComplete="name"
                  className="glass-input w-full"
                  placeholder="Admin adi"
                  {...form.register("name")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="adminEmail"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  E-posta
                </label>
                <input
                  id="adminEmail"
                  type="email"
                  autoComplete="email"
                  className="glass-input w-full"
                  placeholder="admin@example.com"
                  {...form.register("email")}
                />
              </div>

              {message ? (
                <p
                  className="text-sm"
                  style={{
                    color:
                      message.type === "success"
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {message.text}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="btn-primary w-full py-3 text-sm"
              >
                {form.formState.isSubmitting
                  ? "Profil kaydediliyor..."
                  : "Profili Kaydet"}
              </button>
            </form>
          </article>
        </div>
      </section>
    </AppShell>
  );
}
