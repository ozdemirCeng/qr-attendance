import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  QR_TOKEN_VERSION,
  QrTokenPayload,
  QrVerificationResult,
} from '../qr.types';
import { QrNonceStoreService } from './qr-nonce-store.service';

@Injectable()
export class QrTokenService {
  private readonly secret: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly qrNonceStore: QrNonceStoreService,
  ) {
    this.secret =
      this.configService.get<string>('QR_SECRET') ?? 'insecure-qr-secret';
  }

  generateToken(
    sessionId: string,
    rotationSeconds: number,
    nowMs = Date.now(),
  ) {
    const safeRotation = this.normalizeRotation(rotationSeconds);
    const timeWindow = this.resolveTimeWindow(nowMs, safeRotation);

    const payloadWithoutSignature = {
      v: QR_TOKEN_VERSION,
      sid: sessionId,
      tw: timeWindow,
      nonce: randomBytes(12).toString('base64url'),
    };

    const payload: QrTokenPayload = {
      ...payloadWithoutSignature,
      sig: this.signPayload(payloadWithoutSignature),
    };

    return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  }

  getExpiresIn(rotationSeconds: number, nowMs = Date.now()) {
    const safeRotation = this.normalizeRotation(rotationSeconds);
    const nowSeconds = Math.floor(nowMs / 1000);
    const elapsed = nowSeconds % safeRotation;

    return elapsed === 0 ? safeRotation : safeRotation - elapsed;
  }

  async verifyToken(
    rawToken: string,
    rotationSeconds: number,
    nowMs = Date.now(),
  ): Promise<QrVerificationResult> {
    const safeRotation = this.normalizeRotation(rotationSeconds);
    const payload = this.decodeToken(rawToken);

    if (!payload) {
      return {
        valid: false,
        code: 'INVALID_TOKEN',
      };
    }

    const expectedSignature = this.signPayload({
      v: payload.v,
      sid: payload.sid,
      tw: payload.tw,
      nonce: payload.nonce,
    });

    if (!this.safeEquals(payload.sig, expectedSignature)) {
      return {
        valid: false,
        code: 'INVALID_SIGNATURE',
      };
    }

    const currentWindow = this.resolveTimeWindow(nowMs, safeRotation);
    if (Math.abs(currentWindow - payload.tw) > 1) {
      return {
        valid: false,
        code: 'EXPIRED_TOKEN',
      };
    }

    if (await this.qrNonceStore.isUsed(payload.sid, payload.nonce)) {
      return {
        valid: false,
        code: 'REPLAY_ATTACK',
      };
    }

    await this.qrNonceStore.markUsed(
      payload.sid,
      payload.nonce,
      safeRotation * 2,
    );

    return {
      valid: true,
      sessionId: payload.sid,
      timeWindow: payload.tw,
      nonce: payload.nonce,
      tokenVersion: payload.v,
    };
  }

  private decodeToken(rawToken: string): QrTokenPayload | null {
    try {
      const decoded = Buffer.from(rawToken, 'base64url').toString('utf-8');
      const parsed = JSON.parse(decoded) as Partial<QrTokenPayload>;

      if (
        parsed.v !== QR_TOKEN_VERSION ||
        typeof parsed.sid !== 'string' ||
        typeof parsed.tw !== 'number' ||
        !Number.isFinite(parsed.tw) ||
        typeof parsed.nonce !== 'string' ||
        typeof parsed.sig !== 'string'
      ) {
        return null;
      }

      return {
        v: parsed.v,
        sid: parsed.sid,
        tw: parsed.tw,
        nonce: parsed.nonce,
        sig: parsed.sig,
      };
    } catch {
      return null;
    }
  }

  private signPayload(payload: {
    v: number;
    sid: string;
    tw: number;
    nonce: string;
  }) {
    return createHmac('sha256', this.secret)
      .update(`${payload.v}:${payload.sid}:${payload.tw}:${payload.nonce}`)
      .digest('base64url');
  }

  private resolveTimeWindow(nowMs: number, rotationSeconds: number) {
    const nowSeconds = Math.floor(nowMs / 1000);
    return Math.floor(nowSeconds / rotationSeconds);
  }

  private normalizeRotation(rotationSeconds: number) {
    if (!Number.isFinite(rotationSeconds) || rotationSeconds <= 0) {
      return 60;
    }

    return Math.floor(rotationSeconds);
  }

  private safeEquals(left: string, right: string) {
    const leftBuffer = Buffer.from(left, 'utf-8');
    const rightBuffer = Buffer.from(right, 'utf-8');

    if (leftBuffer.length !== rightBuffer.length) {
      return false;
    }

    return timingSafeEqual(leftBuffer, rightBuffer);
  }
}
