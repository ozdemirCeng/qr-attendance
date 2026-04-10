"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import {
  participantChangePassword,
  participantUpdateProfile,
} from "@/lib/participant-auth";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

type ProfileValues = {
  name: string;
  email: string;
  phone: string;
};

type PasswordValues = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export default function ParticipantProfilePage() {
  const router = useRouter();
  const {
    participantUser,
    isParticipantLoading,
    participantSignOut,
    refreshParticipantSession,
  } = useParticipantAuth();
  const [profileMessage, setProfileMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const profileForm = useForm<ProfileValues>({
    defaultValues: {
      name: "",
      email: "",
      phone: "",
    },
  });
  const passwordForm = useForm<PasswordValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (!isParticipantLoading && !participantUser) {
      router.replace("/login?role=participant&next=/profile");
    }
  }, [isParticipantLoading, participantUser, router]);

  useEffect(() => {
    if (!participantUser) {
      return;
    }

    profileForm.reset({
      name: participantUser.name,
      email: participantUser.email,
      phone: participantUser.phone ?? "",
    });
  }, [participantUser, profileForm]);

  async function onProfileSubmit(values: ProfileValues) {
    setProfileMessage(null);

    try {
      const result = await participantUpdateProfile({
        name: values.name.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
      });

      profileForm.reset({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone ?? "",
      });
      await refreshParticipantSession();
      setProfileMessage({
        type: "success",
        text: "Profil guncellendi.",
      });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Bir hata olustu.",
      });
    }
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setPasswordMessage(null);

    if (values.newPassword !== values.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Yeni sifreler eslesmiyor.",
      });
      return;
    }

    if (values.newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Yeni sifre en az 6 karakter olmali.",
      });
      return;
    }

    try {
      await participantChangePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      setPasswordMessage({
        type: "success",
        text: "Sifre basariyla degistirildi.",
      });
      passwordForm.reset();
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Bir hata olustu.",
      });
    }
  }

  if (isParticipantLoading || !participantUser) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Yukleniyor...
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <section className="mx-auto max-w-lg space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Hesabim
            </p>
            <h1
              className="mt-1 text-2xl font-extrabold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Profil
            </h1>
          </div>
          <Link href="/scan" className="btn-secondary text-sm">
            Tarama Ekrani
          </Link>
        </div>

        <div className="glass-elevated animate-scale-in rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
              }}
            >
              <span className="text-white font-bold">
                {participantUser.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p
                className="text-lg font-bold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {participantUser.name}
              </p>
              <p
                className="text-sm truncate"
                style={{ color: "var(--text-secondary)" }}
              >
                {participantUser.email}
              </p>
            </div>
          </div>
        </div>

        <article className="glass rounded-2xl p-6">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Bilgileri Duzenle
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={profileForm.handleSubmit((values) => {
              void onProfileSubmit(values);
            })}
          >
            <div className="space-y-1.5">
              <label
                htmlFor="profileName"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Ad Soyad
              </label>
              <input
                id="profileName"
                type="text"
                className="glass-input w-full"
                {...profileForm.register("name")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="profileEmail"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                E-posta
              </label>
              <input
                id="profileEmail"
                type="email"
                className="glass-input w-full"
                {...profileForm.register("email")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="profilePhone"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Telefon
              </label>
              <input
                id="profilePhone"
                type="tel"
                className="glass-input w-full"
                {...profileForm.register("phone")}
              />
            </div>
            {profileMessage ? (
              <p
                className="text-sm"
                style={{
                  color:
                    profileMessage.type === "success"
                      ? "var(--success)"
                      : "var(--error)",
                }}
              >
                {profileMessage.text}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={profileForm.formState.isSubmitting}
              className="btn-primary w-full py-2.5 text-sm"
            >
              {profileForm.formState.isSubmitting
                ? "Kaydediliyor..."
                : "Kaydet"}
            </button>
          </form>
        </article>

        <article className="glass rounded-2xl p-6">
          <h2
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            Sifre Degistir
          </h2>
          <form
            className="mt-4 space-y-4"
            onSubmit={passwordForm.handleSubmit((values) => {
              void onPasswordSubmit(values);
            })}
          >
            <div className="space-y-1.5">
              <label
                htmlFor="currentPassword"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Mevcut Sifre
              </label>
              <input
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                className="glass-input w-full"
                {...passwordForm.register("currentPassword")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="newPassword"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Yeni Sifre
              </label>
              <input
                id="newPassword"
                type="password"
                autoComplete="new-password"
                className="glass-input w-full"
                {...passwordForm.register("newPassword")}
              />
            </div>
            <div className="space-y-1.5">
              <label
                htmlFor="confirmPassword"
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: "var(--text-secondary)" }}
              >
                Yeni Sifre Tekrar
              </label>
              <input
                id="confirmPassword"
                type="password"
                autoComplete="new-password"
                className="glass-input w-full"
                {...passwordForm.register("confirmPassword")}
              />
            </div>
            {passwordMessage ? (
              <p
                className="text-sm"
                style={{
                  color:
                    passwordMessage.type === "success"
                      ? "var(--success)"
                      : "var(--error)",
                }}
              >
                {passwordMessage.text}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="btn-secondary w-full py-2.5 text-sm"
            >
              {passwordForm.formState.isSubmitting
                ? "Degistiriliyor..."
                : "Sifreyi Degistir"}
            </button>
          </form>
        </article>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              void participantSignOut().then(() => {
                router.replace("/login?role=participant");
              });
            }}
            className="text-sm font-medium"
            style={{ color: "var(--error)" }}
          >
            Hesaptan Cikis Yap
          </button>
        </div>
      </section>
    </main>
  );
}
