import { GuestCheckInForm } from "@/features/scan/components/guest-check-in-form";

type GuestFormPageProps = {
  params: {
    eventId: string;
  };
};

export default function GuestFormPage({ params }: GuestFormPageProps) {
  return (
    <main className="min-h-screen bg-zinc-100 px-4 py-8 text-zinc-900 sm:px-6">
      <section className="mx-auto max-w-xl rounded-3xl bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-semibold">Misafir Bilgileri</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Kayit bulunamadi. Check-in tamamlamak icin bilgilerini gir.
        </p>

        <div className="mt-6">
          <GuestCheckInForm eventId={params.eventId} />
        </div>
      </section>
    </main>
  );
}
