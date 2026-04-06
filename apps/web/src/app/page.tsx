import { AppShell } from "@/components/layout/app-shell";
import { EventCard } from "@/features/events/components/event-card";

export default function Home() {
  return (
    <AppShell>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <EventCard title="Yazilim Muhendisligi Semineri" date="06.04.2026 14:00" status="Taslak" />
        <EventCard title="Staj Bilgilendirme Oturumu" date="07.04.2026 11:00" status="Aktif" />
      </section>
    </AppShell>
  );
}
