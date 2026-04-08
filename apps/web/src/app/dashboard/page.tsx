import { AppShell } from "@/components/layout/app-shell";
import { DashboardEventsPanel } from "@/features/events/components/dashboard-events-panel";

export default function DashboardPage() {
  return (
    <AppShell>
      <DashboardEventsPanel />
    </AppShell>
  );
}
