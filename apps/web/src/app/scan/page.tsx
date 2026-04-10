"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { UserShell } from "@/components/layout/user-shell";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ApiError } from "@/lib/api";
import { getActiveSession, type PortalRole } from "@/lib/auth";
import {
  getLocationHelpText,
  requestDeviceLocation,
} from "@/features/scan/lib/device-permissions";
import { useAuth } from "@/providers/auth-provider";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

export default function ScanLandingPage() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { participantUser, isParticipantLoading, participantSignOut } =
    useParticipantAuth();
  const [activeRole, setActiveRole] = useState<PortalRole | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [permissionMessage, setPermissionMessage] = useState<string | null>(
    null,
  );
  const [isRequestingPermissions, setIsRequestingPermissions] = useState(false);

  useEffect(() => {
    if (user) {
      setActiveRole(user.role);
      return;
    }

    if (participantUser) {
      setActiveRole("member");
      return;
    }

    if (isLoading || isParticipantLoading) {
      return;
    }

    let isMounted = true;

    async function resolveSession() {
      try {
        const session = await getActiveSession();
        if (isMounted) {
          setActiveRole(session.data.role);
        }
      } catch (error) {
        if (isMounted && error instanceof ApiError && error.statusCode === 401) {
          setActiveRole(null);
        }
      }
    }

    void resolveSession();

    return () => {
      isMounted = false;
    };
  }, [isLoading, isParticipantLoading, participantUser, user]);

  async function requestCameraPermission() {
    if (!window.isSecureContext) {
      setErrorMessage(
        "Kamera ve konum izni için site HTTPS üzerinden açılmalıdır.",
      );
      return false;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("Bu tarayıcı kamera erişimini desteklemiyor.");
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
        },
        audio: false,
      });

      for (const track of stream.getTracks()) {
        track.stop();
      }

      return true;
    } catch {
      setErrorMessage(
        `Kamera izni verilmedi. Tarayıcı ayarlarından kamera iznini açın. ${getLocationHelpText()}`,
      );
      return false;
    }
  }

  async function onStart() {
    setIsRequestingPermissions(true);
    setErrorMessage(null);
    setPermissionMessage(null);

    try {
      const locationResult = await requestDeviceLocation();

      if (!locationResult.ok) {
        setErrorMessage(locationResult.message);
        return;
      }

      const hasCameraPermission = await requestCameraPermission();

      if (!hasCameraPermission) {
        return;
      }

      setPermissionMessage("Konum ve kamera hazır. Tarama açılıyor.");
      router.push("/check-in");
    } finally {
      setIsRequestingPermissions(false);
    }
  }

  const resolvedRole: PortalRole | null = participantUser
    ? "member"
    : user?.role ?? activeRole;

  const pageContent = (
    <section className="mx-auto w-full max-w-3xl space-y-4">
      <div className="glass rounded-2xl p-5">
        {participantUser ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p
                className="truncate text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {participantUser.name}
              </p>
              <p
                className="truncate text-xs"
                style={{ color: "var(--text-tertiary)" }}
              >
                {participantUser.email}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/user/profile" className="btn-secondary text-xs">
                Profil
              </Link>
              <button
                type="button"
                onClick={() => {
                  void participantSignOut();
                }}
                className="btn-ghost text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                Çıkış
              </button>
            </div>
          </div>
        ) : resolvedRole && resolvedRole !== "member" ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Admin oturumu aktif. Tarama adımına devam edebilirsiniz.
            </p>
            <Link href="/dashboard" className="btn-secondary text-xs">
              Panele Dön
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Misafir tarama açık. Giriş yaparsan profil ve geçmişin de eşlenir.
            </p>
            <div className="flex gap-2">
              <Link href="/login?next=/scan" className="btn-secondary text-xs">
                Giriş
              </Link>
              <Link href="/auth/signup" className="btn-primary text-xs">
                Kayıt Ol
              </Link>
            </div>
          </div>
        )}
      </div>

      <article className="glass-elevated rounded-3xl p-8">
        <div className="mb-6 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </div>
          <h1
            className="text-3xl font-extrabold tracking-tight"
            style={{ color: "var(--text-primary)" }}
            data-display="true"
          >
            QR Yoklama
          </h1>
          <p
            className="mt-2 text-sm leading-6"
            style={{ color: "var(--text-secondary)" }}
          >
            Butona bastığında önce iPhone konum izni, sonra kamera izni
            istenir. Konum izni gelmiyorsa site HTTPS üzerinden açılmalıdır.
          </p>
        </div>

        <div className="space-y-4">
          {errorMessage ? (
            <div
              className="rounded-xl border px-3 py-2 text-sm"
              style={{
                color: "var(--error)",
                background: "var(--error-soft)",
                borderColor: "var(--error)",
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          {permissionMessage ? (
            <div
              className="rounded-xl border px-3 py-2 text-sm"
              style={{
                color: "var(--success)",
                background: "var(--success-soft)",
                borderColor: "var(--success)",
              }}
            >
              {permissionMessage}
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => {
              void onStart();
            }}
            disabled={isRequestingPermissions}
            className="btn-primary w-full py-3 text-base"
          >
            {isRequestingPermissions
              ? "İzinler isteniyor..."
              : "Konum ve Kamerayı Aç"}
          </button>
        </div>
      </article>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="glass rounded-2xl p-4">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            1. Konum
          </p>
          <p
            className="mt-1 text-xs leading-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Etkinlik alanında olduğunu doğrular.
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            2. QR
          </p>
          <p
            className="mt-1 text-xs leading-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Etkinlik kodunu kameradan okutur.
          </p>
        </div>
        <div className="glass rounded-2xl p-4">
          <p
            className="text-sm font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            3. Selfie
          </p>
          <p
            className="mt-1 text-xs leading-5"
            style={{ color: "var(--text-tertiary)" }}
          >
            Katılımı profil fotoğrafı ile doğrular.
          </p>
        </div>
      </div>
    </section>
  );

  if (resolvedRole === "member") {
    return <UserShell>{pageContent}</UserShell>;
  }

  if (resolvedRole) {
    return <AppShell>{pageContent}</AppShell>;
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>
      {pageContent}
    </main>
  );
}
