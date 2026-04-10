"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { VerificationSelfieCapture } from "@/features/scan/components/verification-selfie-capture";
import { ApiError } from "@/lib/api";
import {
  participantChangePassword,
  participantUpdateProfile,
} from "@/lib/participant-auth";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

import { UserShell } from "@/components/layout/user-shell";

type ProfileValues = {
  name: string;
  email: string;
  phone: string;
  avatarDataUrl: string | null;
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
      avatarDataUrl: null,
    },
  });
  const passwordForm = useForm<PasswordValues>({
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const avatarDataUrl = useWatch({
    control: profileForm.control,
    name: "avatarDataUrl",
  });

  useEffect(() => {
    if (!isParticipantLoading && !participantUser) {
      router.replace("/login?next=/user/profile");
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
      avatarDataUrl: participantUser.avatarDataUrl,
    });
  }, [participantUser, profileForm]);

  async function onProfileSubmit(values: ProfileValues) {
    setProfileMessage(null);

    try {
      const result = await participantUpdateProfile({
        name: values.name.trim() || undefined,
        email: values.email.trim() || undefined,
        phone: values.phone.trim() || undefined,
        avatarDataUrl: values.avatarDataUrl,
      });

      profileForm.reset({
        name: result.data.name,
        email: result.data.email,
        phone: result.data.phone ?? "",
        avatarDataUrl: result.data.avatarDataUrl,
      });
      await refreshParticipantSession();
      setProfileMessage({
        type: "success",
        text: "Profil güncellendi.",
      });
    } catch (error) {
      setProfileMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Bir hata oluştu.",
      });
    }
  }

  async function onPasswordSubmit(values: PasswordValues) {
    setPasswordMessage(null);

    if (values.newPassword !== values.confirmPassword) {
      setPasswordMessage({
        type: "error",
        text: "Yeni şifreler eşleşmiyor.",
      });
      return;
    }

    if (values.newPassword.length < 6) {
      setPasswordMessage({
        type: "error",
        text: "Yeni şifre en az 6 karakter olmalı.",
      });
      return;
    }

    try {
      await participantChangePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      passwordForm.reset();
      setPasswordMessage({
        type: "success",
        text: "Şifre başarıyla değiştirildi.",
      });
    } catch (error) {
      setPasswordMessage({
        type: "error",
        text: error instanceof ApiError ? error.message : "Bir hata oluştu.",
      });
    }
  }

  if (isParticipantLoading || !participantUser) {
    return null;
  }

  return (
    <UserShell>
      <section className="mx-auto grid w-full max-w-6xl items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="space-y-5">
          <div>
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.2em]"
              style={{ color: "var(--text-secondary)" }}
            >
              Profil
            </p>
            <h1
              className="mt-2 text-3xl font-extrabold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Hesap bilgilerini güncelle
            </h1>
          </div>

          <article className="glass rounded-2xl p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div
                className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
                }}
              >
                {avatarDataUrl ? (
                  <Image
                    src={avatarDataUrl}
                    alt={`${participantUser.name} profil fotoğrafı`}
                    fill
                    unoptimized
                    sizes="64px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-white">
                    {participantUser.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {participantUser.name}
                </p>
                <p
                  className="truncate text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {participantUser.email}
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
              Profil Bilgileri
            </h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={profileForm.handleSubmit(onProfileSubmit)}
            >
              <VerificationSelfieCapture
                title="Profil Fotoğrafı"
                description="Panelde görünen fotoğrafı burada güncelleyebilirsiniz."
                value={avatarDataUrl}
                onChange={(value) => {
                  profileForm.setValue("avatarDataUrl", value, {
                    shouldDirty: true,
                  });
                }}
              />

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
                <div
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{
                    color:
                      profileMessage.type === "success"
                        ? "var(--success)"
                        : "var(--error)",
                    background:
                      profileMessage.type === "success"
                        ? "var(--success-soft)"
                        : "var(--error-soft)",
                    borderColor:
                      profileMessage.type === "success"
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {profileMessage.text}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={profileForm.formState.isSubmitting}
                className="btn-primary w-full py-3 text-sm"
              >
                {profileForm.formState.isSubmitting
                  ? "Kaydediliyor..."
                  : "Profili Kaydet"}
              </button>
            </form>
          </article>
        </div>

        <div className="space-y-5 xl:sticky xl:top-24">
          <article className="glass rounded-2xl p-6">
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Şifreyi Güncelle
            </h2>
            <form
              className="mt-4 space-y-4"
              onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
            >
              <div className="space-y-1.5">
                <label
                  htmlFor="currentPassword"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Mevcut Şifre
                </label>
                <input
                  id="currentPassword"
                  type="password"
                  className="glass-input w-full"
                  autoComplete="current-password"
                  {...passwordForm.register("currentPassword")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="newPassword"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Yeni Şifre
                </label>
                <input
                  id="newPassword"
                  type="password"
                  className="glass-input w-full"
                  autoComplete="new-password"
                  {...passwordForm.register("newPassword")}
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirmPassword"
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Yeni Şifre Tekrar
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  className="glass-input w-full"
                  autoComplete="new-password"
                  {...passwordForm.register("confirmPassword")}
                />
              </div>

              {passwordMessage ? (
                <div
                  className="rounded-xl border px-3 py-2 text-sm"
                  style={{
                    color:
                      passwordMessage.type === "success"
                        ? "var(--success)"
                        : "var(--error)",
                    background:
                      passwordMessage.type === "success"
                        ? "var(--success-soft)"
                        : "var(--error-soft)",
                    borderColor:
                      passwordMessage.type === "success"
                        ? "var(--success)"
                        : "var(--error)",
                  }}
                >
                  {passwordMessage.text}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={passwordForm.formState.isSubmitting}
                className="btn-secondary w-full py-3 text-sm"
              >
                {passwordForm.formState.isSubmitting
                  ? "Güncelleniyor..."
                  : "Şifreyi Değiştir"}
              </button>
            </form>
          </article>

          <article className="glass rounded-2xl p-6">
            <h2
              className="text-lg font-bold"
              style={{ color: "var(--text-primary)" }}
              data-display="true"
            >
              Kısayollar
            </h2>
            <div className="mt-4 grid gap-2">
              <Link href="/user/dashboard" className="btn-secondary text-sm">
                Panele Dön
              </Link>
              <Link href="/user/scan" className="btn-primary text-sm">
                QR Taramaya Git
              </Link>
            </div>
          </article>
        </div>
      </section>
    </UserShell>
  );
}
