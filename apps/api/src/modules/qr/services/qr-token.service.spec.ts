import { ConfigService } from '@nestjs/config';

import { QrNonceStoreService } from './qr-nonce-store.service';
import { QrTokenService } from './qr-token.service';

describe('QrTokenService', () => {
  let service: QrTokenService;
  let nonceStore: {
    isUsed: jest.Mock<Promise<boolean>, [string, string]>;
    markUsed: jest.Mock<Promise<void>, [string, string, number]>;
    getTokenForCode: jest.Mock<Promise<string | null>, [string]>;
    setTokenForCode: jest.Mock<Promise<void>, [string, string, number]>;
  };

  const nowMs = Date.parse('2026-04-08T10:00:00.000Z');

  beforeEach(() => {
    nonceStore = {
      isUsed: jest
        .fn<Promise<boolean>, [string, string]>()
        .mockResolvedValue(false),
      markUsed: jest
        .fn<Promise<void>, [string, string, number]>()
        .mockResolvedValue(undefined),
      getTokenForCode: jest
        .fn<Promise<string | null>, [string]>()
        .mockResolvedValue(null),
      setTokenForCode: jest
        .fn<Promise<void>, [string, string, number]>()
        .mockResolvedValue(undefined),
    };

    const configService = {
      get: (key: string) => {
        if (key === 'QR_SECRET') {
          return 'qr-secret-for-unit-tests-12345';
        }

        return undefined;
      },
    } as unknown as ConfigService;

    service = new QrTokenService(
      configService,
      nonceStore as unknown as QrNonceStoreService,
    );
  });

  it('accepts a valid token', async () => {
    const token = service.generateToken('session-valid', 60, nowMs);

    const verification = await service.verifyToken(token, 60, nowMs + 2_000);

    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.sessionId).toBe('session-valid');
    }
    expect(nonceStore.markUsed).not.toHaveBeenCalled();

    const consumed = await service.consumeNonce(
      'session-valid',
      verification.valid ? verification.nonce : 'invalid',
      60,
    );

    expect(consumed).toBe(true);
    expect(nonceStore.markUsed).toHaveBeenCalledWith(
      'session-valid',
      expect.any(String),
      120,
    );
  });

  it('rejects an expired token', async () => {
    const token = service.generateToken('session-expired', 60, nowMs);

    const verification = await service.verifyToken(token, 60, nowMs + 180_000);

    expect(verification).toEqual({
      valid: false,
      code: 'EXPIRED_TOKEN',
    });
  });

  it('rejects invalid signature', async () => {
    const token = service.generateToken('session-signature', 60, nowMs);
    const tampered = tamperSignature(token);

    const verification = await service.verifyToken(tampered, 60, nowMs + 1_000);

    expect(verification).toEqual({
      valid: false,
      code: 'INVALID_SIGNATURE',
    });
  });

  it('rejects replayed token', async () => {
    nonceStore.isUsed.mockResolvedValue(true);
    const token = service.generateToken('session-replay', 60, nowMs);

    const verification = await service.verifyToken(token, 60, nowMs + 1_000);

    expect(verification).toEqual({
      valid: false,
      code: 'REPLAY_ATTACK',
    });
  });

  it('accepts token with one-window clock skew tolerance', async () => {
    const token = service.generateToken('session-skew', 60, nowMs);

    const verification = await service.verifyToken(token, 60, nowMs + 61_000);

    expect(verification.valid).toBe(true);
    if (verification.valid) {
      expect(verification.sessionId).toBe('session-skew');
    }
  });

  it('resolves token from full check-in URL input', async () => {
    const token = service.generateToken('session-url', 60, nowMs);
    const url = `https://example.com/check-in/event-1?token=${encodeURIComponent(token)}`;

    const resolved = await service.resolveTokenFromInput(url);

    expect(resolved).toBe(token);
  });

  it('resolves token from encoded URL input', async () => {
    const token = service.generateToken('session-encoded-url', 60, nowMs);
    const innerUrl = `https://example.com/check-in/event-1?token=${encodeURIComponent(token)}`;
    const encodedUrl = encodeURIComponent(innerUrl);

    const resolved = await service.resolveTokenFromInput(encodedUrl);

    expect(resolved).toBe(token);
  });

  it('resolves mapped short verification code', async () => {
    const token = service.generateToken('session-code', 60, nowMs);
    nonceStore.getTokenForCode.mockResolvedValue(token);

    const resolved = await service.resolveTokenFromInput('ABCD-EFGH');

    expect(nonceStore.getTokenForCode).toHaveBeenCalledWith('ABCD-EFGH');
    expect(resolved).toBe(token);
  });
});

function tamperSignature(token: string) {
  const decoded = Buffer.from(token, 'base64url').toString('utf-8');
  const payload = JSON.parse(decoded) as {
    v: number;
    sid: string;
    tw: number;
    nonce: string;
    sig: string;
  };

  payload.sig = 'tampered-signature';

  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
}
