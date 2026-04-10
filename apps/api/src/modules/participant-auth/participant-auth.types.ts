export type ParticipantUserEntity = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarDataUrl: string | null;
  passwordHash: string;
  createdAt: string;
};
