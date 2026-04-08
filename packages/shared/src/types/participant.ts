export type ParticipantSource = "csv" | "manual" | "self_registered";

export type ParticipantEntity = {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: ParticipantSource;
  externalId: string | null;
  createdAt: string;
};

export type CreateManualParticipantPayload = {
  name: string;
  email?: string;
  phone?: string;
};
