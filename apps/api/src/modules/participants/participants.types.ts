export const PARTICIPANT_SOURCES = [
  'csv',
  'manual',
  'self_registered',
] as const;

export type ParticipantSource = (typeof PARTICIPANT_SOURCES)[number];

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

export type UploadedCsvFile = {
  buffer: Buffer;
  originalname: string;
  mimetype: string;
  size: number;
};
