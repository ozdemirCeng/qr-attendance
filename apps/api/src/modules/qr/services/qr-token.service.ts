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
  private static readonly VERIFICATION_CODE_LENGTH = 8;
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

  generateVerificationCode(token: string) {
    return this.generateVerificationCodeFromSeed(`token:${token}`);
  }

  generateSessionVerificationCode(
    sessionId: string,
    rotationSeconds: number,
    nowMs = Date.now(),
  ) {
    const safeRotation = this.normalizeRotation(rotationSeconds);
    const currentWindow = this.resolveTimeWindow(nowMs, safeRotation);

    return this.generateSessionVerificationCodeForWindow(sessionId, currentWindow);
  }

  matchesSessionVerificationCode(
    verificationCode: string,
    sessionId: string,
    rotationSeconds: number,
    nowMs = Date.now(),
  ) {
    const normalizedInput = this.normalizeVerificationCode(verificationCode);

    if (!normalizedInput) {
      return false;
    }

    const safeRotation = this.normalizeRotation(rotationSeconds);
    const currentWindow = this.resolveTimeWindow(nowMs, safeRotation);

    for (const offset of [0, -1, 1]) {
      const candidate = this.generateSessionVerificationCodeForWindow(
        sessionId,
        currentWindow + offset,
      );
      const normalizedCandidate = this.normalizeVerificationCode(candidate);

      if (normalizedCandidate && normalizedCandidate === normalizedInput) {
        return true;
      }
    }

    return false;
  }

  private generateSessionVerificationCodeForWindow(
    sessionId: string,
    timeWindow: number,
  ) {
    return this.generateVerificationCodeFromSeed(
      `session:${sessionId}:${timeWindow}`,
    );
  }

  private generateVerificationCodeFromSeed(seed: string) {
    const digest = createHmac('sha256', this.secret)
      .update(`code:${seed}`)
      .digest('base64url')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    const compact =
      digest.slice(0, QrTokenService.VERIFICATION_CODE_LENGTH) ||
      randomBytes(8)
        .toString('hex')
        .slice(0, QrTokenService.VERIFICATION_CODE_LENGTH)
        .toUpperCase();

    return `${compact.slice(0, 4)}-${compact.slice(4, 8)}`;
  }

  private normalizeVerificationCode(value: string | null | undefined) {
    const compact = value?.trim().replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    if (!compact || compact.length !== QrTokenService.VERIFICATION_CODE_LENGTH) {
      return null;
    }

    return compact;
  }

  async registerVerificationCode(
    verificationCode: string,
    token: string,
    ttlSeconds: number,
  ) {
    await this.qrNonceStore.setTokenForCode(verificationCode, token, ttlSeconds);
  }

  async resolveTokenFromInput(rawInput: string) {
    const normalized = this.normalizeInputValue(rawInput);

    if (!normalized) {
      return null;
    }

    const candidates = this.expandTokenCandidates(normalized);

    for (const candidate of candidates) {
      if (this.decodeToken(candidate)) {
        return candidate;
      }
    }

    for (const candidate of candidates) {
      if (!this.isPotentialVerificationCode(candidate)) {
        continue;
      }

      const mappedToken = await this.qrNonceStore.getTokenForCode(candidate);

      if (!mappedToken) {
        continue;
      }

      const mappedNormalized = this.normalizeInputValue(mappedToken);
      if (!mappedNormalized) {
        continue;
      }

      if (this.decodeToken(mappedNormalized)) {
        return mappedNormalized;
      }
    }

    return candidates[0] ?? null;
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

    return {
      valid: true,
      sessionId: payload.sid,
      timeWindow: payload.tw,
      nonce: payload.nonce,
      tokenVersion: payload.v,
    };
  }

  async consumeNonce(
    sessionId: string,
    nonce: string,
    rotationSeconds: number,
  ) {
    const safeRotation = this.normalizeRotation(rotationSeconds);

    if (await this.qrNonceStore.isUsed(sessionId, nonce)) {
      return false;
    }

    await this.qrNonceStore.markUsed(sessionId, nonce, safeRotation * 2);
    return true;
  }

  private decodeToken(rawToken: string): QrTokenPayload | null {
    const parsed = this.parseTokenPayload(rawToken);

    if (!parsed) {
      return null;
    }

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
  }

  private parseTokenPayload(rawToken: string): Partial<QrTokenPayload> | null {
    const candidates = [rawToken, this.normalizeBase64Url(rawToken)];

    for (const candidate of candidates) {
      try {
        const decoded = Buffer.from(candidate, 'base64url').toString('utf-8');
        const parsed = JSON.parse(decoded) as Partial<QrTokenPayload>;
        return parsed;
      } catch {
        // Try next candidate.
      }
    }

    return null;
  }

  private normalizeBase64Url(value: string) {
    return value.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }

  private expandTokenCandidates(input: string) {
    const queue: string[] = [input];
    const results: string[] = [];
    const seen = new Set<string>();

    while (queue.length > 0) {
      const current = queue.shift();

      if (!current || seen.has(current)) {
        continue;
      }

      seen.add(current);
      results.push(current);

      const fromUrl = this.extractTokenFromUrl(current);
      if (fromUrl && !seen.has(fromUrl)) {
        queue.push(fromUrl);
      }

      const decodedComponent = this.tryDecodeURIComponent(current);
      if (
        decodedComponent &&
        decodedComponent !== current &&
        !seen.has(decodedComponent)
      ) {
        queue.push(decodedComponent);
      }

      const unquoted = this.stripWrappingQuotes(current);
      if (unquoted && unquoted !== current && !seen.has(unquoted)) {
        queue.push(unquoted);
      }
    }

    return results;
  }

  private extractTokenFromUrl(value: string) {
    const fromAbsolute = this.extractTokenFromAbsoluteUrl(value);
    if (fromAbsolute) {
      return fromAbsolute;
    }

    const regexMatch = value.match(/(?:[?&]token=)([^&#]+)/i);
    if (!regexMatch?.[1]) {
      return null;
    }

    return this.normalizeInputValue(regexMatch[1]);
  }

  private extractTokenFromAbsoluteUrl(value: string) {
    try {
      const parsedUrl = new URL(value);
      const tokenParam = parsedUrl.searchParams.get('token');

      return this.normalizeInputValue(tokenParam ?? undefined);
    } catch {
      return null;
    }
  }

  private tryDecodeURIComponent(value: string) {
    try {
      return this.normalizeInputValue(decodeURIComponent(value));
    } catch {
      return null;
    }
  }

  private stripWrappingQuotes(value: string) {
    if (value.length < 2) {
      return value;
    }

    const startsWithSingle = value.startsWith('\'');
    const endsWithSingle = value.endsWith('\'');
    const startsWithDouble = value.startsWith('"');
    const endsWithDouble = value.endsWith('"');

    if ((startsWithSingle && endsWithSingle) || (startsWithDouble && endsWithDouble)) {
      return value.slice(1, -1).trim();
    }

    return value;
  }

  private isPotentialVerificationCode(value: string) {
    const compact = value.replace(/[^a-zA-Z0-9]/g, '');

    return compact.length >= 6 && compact.length <= 16;
  }

  private normalizeInputValue(value: string | null | undefined) {
    const trimmed = value?.trim();

    return trimmed ? trimmed : null;
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
