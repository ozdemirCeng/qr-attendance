"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useState } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useParticipantAuth } from "@/providers/participant-auth-provider";

const navigationItems = [
  { href: "/user/dashboard", label: "Panel" },
  { href: "/user/profile", label: "Profil" },
  { href: "/user/scan", label: "QR Tara" },
] as const;

function getInitials(name: string | undefined) {
  if (!name) {
    return "U";
  }

  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function UserShell({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const router = useRouter();
  const { participantUser, participantSignOut } = useParticipantAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await participantSignOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="glass-nav fixed inset-x-0 top-0 z-50 h-16">
        <div className="mx-auto flex h-full w-full max-w-7xl items-center justify-between px-5">
          <div className="flex items-center gap-3">
            <div
              className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
              }}
            >
              {participantUser?.avatarDataUrl ? (
                <Image
                  src={participantUser.avatarDataUrl}
                  alt={`${participantUser.name} profil fotoğrafı`}
                  fill
                  unoptimized
                  sizes="40px"
                  className="object-cover"
                />
              ) : (
                <span className="text-sm font-bold text-white">
                  {getInitials(participantUser?.name)}
                </span>
              )}
            </div>
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--primary)" }}
              >
                Kullanıcı Paneli
              </p>
              <p
                className="text-sm font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                {participantUser?.name ?? "Üye"}
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/user/dashboard" &&
                  pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--text-secondary)",
                    background: isActive
                      ? "var(--surface-hover)"
                      : "transparent",
                  }}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSigningOut}
              className="btn-ghost hidden text-xs md:inline-flex"
              style={{ color: "var(--text-secondary)" }}
            >
              {isSigningOut ? "Çıkış..." : "Çıkış"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-5 pb-28 pt-24">
        {children}
      </main>

      <nav className="glass-elevated fixed inset-x-0 bottom-0 z-50 flex items-center justify-around rounded-t-3xl px-2 pb-7 pt-2 md:hidden">
        {navigationItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/user/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-all"
              style={{
                color: isActive ? "var(--primary)" : "var(--text-tertiary)",
              }}
            >
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
