"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PropsWithChildren, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

const navigationItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/dashboard/audit", label: "Audit" },
  { href: "/events/new", label: "Yeni Etkinlik" },
  { href: "/scan", label: "Scan" },
] as const;

export function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  async function handleSignOut() {
    setIsSigningOut(true);
    try {
      await signOut();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsSigningOut(false);
      setIsMobileMenuOpen(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="kp-card p-6">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <h1 className="text-xl font-extrabold tracking-tight" data-display="true">
              QR Yoklama Paneli
            </h1>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen((current) => !current);
              }}
              className="kp-btn-secondary min-h-11 px-4 text-sm font-semibold"
              aria-label="Menuyu ac veya kapat"
            >
              {isMobileMenuOpen ? "Kapat" : "Menu"}
            </button>
          </div>

          <div className="mt-3 hidden items-start justify-between gap-4 md:flex md:flex-wrap md:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-600">
                Management Console
              </p>
              <h1 className="mt-2 text-3xl font-extrabold tracking-tight" data-display="true">
                QR Yoklama Paneli
              </h1>
              <p className="mt-1 text-sm text-zinc-600">
                Hos geldin{user?.name ? `, ${user.name}` : ""}. Etkinliklerini buradan
                yonetebilirsin.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                void handleSignOut();
              }}
              disabled={isSigningOut}
              className="kp-btn-secondary px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Cikis yapiliyor..." : "Cikis"}
            </button>
          </div>

          <nav className="mt-6 hidden flex-wrap gap-2 md:flex">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-zinc-900 text-white shadow-[0_16px_24px_-18px_rgba(0,88,190,0.5)]"
                      : "kp-btn-secondary"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isMobileMenuOpen ? (
            <div className="kp-soft-panel mt-4 rounded-2xl p-3 md:hidden">
              <p className="text-xs text-zinc-500">
                Hos geldin{user?.name ? `, ${user.name}` : ""}
              </p>
              <nav className="mt-3 grid gap-2">
                {navigationItems.map((item) => {
                  const isActive = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                      }}
                      className={`min-h-11 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                        isActive
                          ? "bg-zinc-900 text-white"
                          : "kp-btn-secondary"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    void handleSignOut();
                  }}
                  disabled={isSigningOut}
                  className="kp-btn-secondary min-h-11 px-4 py-3 text-left text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSigningOut ? "Cikis yapiliyor..." : "Cikis"}
                </button>
              </nav>
            </div>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}