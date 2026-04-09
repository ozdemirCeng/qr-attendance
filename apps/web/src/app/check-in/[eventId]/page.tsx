import { CheckInScanner } from "@/features/scan/components/check-in-scanner";

type CheckInPageProps = {
  params: {
    eventId: string;
  };
};

export default function CheckInPage({ params }: CheckInPageProps) {
  return <CheckInScanner eventId={params.eventId} />;
}
