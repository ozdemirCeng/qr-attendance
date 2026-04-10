"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useState } from "react";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/providers/auth-provider";

const navigationItems = [
  {
    href: "/dashboard",
    label: "Panel",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: "/dashboard/audit",
    label: "Denetim",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    href: "/events/new",
    label: "Oluştur",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    ),
  },
  {
    href: "/scan",
    label: "Tara",
    icon: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
] as const;

function resolvePageTitle(pathname: string) {
  if (pathname.startsWith("/dashboard/profile")) return "Profil";
  if (pathname.startsWith("/dashboard/audit")) return "Denetim Kayıtları";
  if (pathname.startsWith("/events/new")) return "Yeni Etkinlik";
  if (pathname.startsWith("/events/")) return "Etkinlik Detayı";
  if (pathname.startsWith("/scan")) return "QR Tarama";
  return "Kontrol Paneli";
}

function getInitials(name: string | undefined) {
  if (!name) return "AU";

  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return "AU";

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}

export function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const pageTitle = resolvePageTitle(pathname);
  const initials = getInitials(user?.name);

  async function handleSignOut() {
    setIsSigningOut(true);

    try {
      await signOut();
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
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </div>
            <div>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                style={{ color: "var(--primary)" }}
              >
                QR Yoklama
              </p>
              <h1
                className="text-sm font-bold"
                style={{ color: "var(--text-primary)" }}
                data-display="true"
              >
                {pageTitle}
              </h1>
            </div>
          </div>

          <nav className="hidden items-center gap-1 md:flex">
            {navigationItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all"
                  style={{
                    color: isActive ? "var(--primary)" : "var(--text-secondary)",
                    background: isActive
                      ? "var(--surface-hover)"
                      : "transparent",
                  }}
                >
                  {item.icon}
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <div className="hidden items-center gap-2 md:flex">
              <button
                type="button"
                onClick={() => {
                  void handleSignOut();
                }}
                disabled={isSigningOut}
                className="btn-ghost text-xs"
                style={{ color: "var(--text-secondary)" }}
              >
                {isSigningOut ? "Çıkış..." : "Çıkış"}
              </button>
            </div>

            <Link
              href="/dashboard/profile"
              className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-transform hover:scale-110"
              style={{
                background:
                  "linear-gradient(135deg, var(--primary-gradient-from), var(--primary-gradient-to))",
                color: "white",
                boxShadow: "var(--shadow-glow)",
              }}
              title="Profil"
            >
              {initials}
            </Link>
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
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-2xl px-4 py-2 transition-all"
              style={{
                color: isActive ? "var(--primary)" : "var(--text-tertiary)",
              }}
            >
              {item.icon}
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
