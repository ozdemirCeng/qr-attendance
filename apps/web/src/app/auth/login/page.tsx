import { redirect } from "next/navigation";

type LegacyParticipantLoginPageProps = {
  searchParams: {
    next?: string;
  };
};

export default function LegacyParticipantLoginPage({
  searchParams,
}: LegacyParticipantLoginPageProps) {
  const params = new URLSearchParams();

  if (
    typeof searchParams.next === "string" &&
    searchParams.next.startsWith("/") &&
    !searchParams.next.startsWith("//")
  ) {
    params.set("next", searchParams.next);
  }

  redirect(`/login?${params.toString()}`);
}
