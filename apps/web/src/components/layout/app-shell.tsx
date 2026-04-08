"use client";

import { useRouter } from "next/navigation";
import { PropsWithChildren, useState } from "react";

import { useAuth } from "@/providers/auth-provider";

export function AppShell({ children }: PropsWithChildren) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

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
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
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
        </header>
        {children}
      </div>
    </main>
  );
}