export const QR_TOKEN_VERSION = 1;

export const QR_VERIFICATION_CODES = [
  'INVALID_TOKEN',
  'INVALID_SIGNATURE',
  'EXPIRED_TOKEN',
  'REPLAY_ATTACK',
] as const;

export type QrVerificationCode = (typeof QR_VERIFICATION_CODES)[number];

export type QrTokenPayload = {
  v: number;
  sid: string;
  tw: number;
  nonce: string;
  sig: string;
};

export type QrVerificationResult =
  | {
      valid: true;
      sessionId: string;
      timeWindow: number;
      nonce: string;
      tokenVersion: number;
    }
  | {
      valid: false;
      code: QrVerificationCode;
    };
