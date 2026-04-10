import { GuestCheckInForm } from "@/features/scan/components/guest-check-in-form";

export default function EventGuestFormPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 sm:px-6">
      <section className="glass-elevated w-full max-w-xl animate-scale-in rounded-3xl p-6 sm:p-8">
        <h1
          className="text-3xl font-extrabold"
          style={{ color: "var(--text-primary)" }}
          data-display="true"
        >
          Misafir Bilgileri
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Kayit bulunamadi. Check-in tamamlamak icin bilgilerini ve profil
          fotografini onayla.
        </p>

        <div className="mt-6">
          <GuestCheckInForm />
        </div>
      </section>
    </main>
  );
}
