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
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 md:hidden">
            <h1 className="text-xl font-semibold">QR Yoklama Paneli</h1>
            <button
              type="button"
              onClick={() => {
                setIsMobileMenuOpen((current) => !current);
              }}
              className="min-h-11 rounded-xl border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 hover:bg-zinc-100"
              aria-label="Menuyu ac veya kapat"
            >
              {isMobileMenuOpen ? "Kapat" : "Menu"}
            </button>
          </div>

          <div className="mt-3 hidden items-start justify-between gap-4 md:flex md:flex-wrap">
            <div>
              <h1 className="text-2xl font-semibold">QR Yoklama Paneli</h1>
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
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSigningOut ? "Cikis yapiliyor..." : "Cikis"}
            </button>
          </div>

          <nav className="mt-4 hidden flex-wrap gap-2 md:flex">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`min-h-11 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                    isActive
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {isMobileMenuOpen ? (
            <div className="mt-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-3 md:hidden">
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
                          : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100"
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
                  className="min-h-11 rounded-xl border border-zinc-300 px-4 py-3 text-left text-sm font-semibold text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
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