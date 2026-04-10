"use client";

import { useSearchParams } from "next/navigation";

import { CheckInScanner } from "@/features/scan/components/check-in-scanner";

type CheckInPageProps = {
  params: {
    eventId: string;
  };
};

export default function CheckInPage({ params }: CheckInPageProps) {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");

  return (
    <CheckInScanner
      eventId={params.eventId}
      initialToken={tokenFromUrl ?? undefined}
    />
  );
}
