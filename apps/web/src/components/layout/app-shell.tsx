import { PropsWithChildren } from "react";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold">QR Yoklama Paneli</h1>
          <p className="mt-1 text-sm text-zinc-600">Moduler klasor yapisi hazirlandi, adim adim ozellik gelistirmeye hazir.</p>
        </header>
        {children}
      </div>
    </main>
  );
}