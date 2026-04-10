import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class QrNonceStoreService {
  private redisClient: Redis | null = null;
  private readonly fallbackStore = new Map<string, number>();
  private readonly fallbackTokenStore = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private readonly redisUrl = process.env.REDIS_URL?.trim() ?? '';

  async isUsed(sessionId: string, nonce: string): Promise<boolean> {
    const key = this.buildNonceKey(sessionId, nonce);
    const redis = this.getRedisClient();

    if (redis) {
      try {
        return (await redis.exists(key)) === 1;
      } catch {
        return this.isUsedFallback(key);
      }
    }

    return this.isUsedFallback(key);
  }

  async markUsed(
    sessionId: string,
    nonce: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.buildNonceKey(sessionId, nonce);
    const safeTtl = Math.max(1, Math.floor(ttlSeconds));
    const redis = this.getRedisClient();

    if (redis) {
      try {
        await redis.set(key, '1', 'EX', safeTtl, 'NX');
        return;
      } catch {
        this.markUsedFallback(key, safeTtl);
        return;
      }
    }

    this.markUsedFallback(key, safeTtl);
  }

  async setTokenForCode(
    verificationCode: string,
    token: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = this.buildCodeKey(verificationCode);
    const safeTtl = Math.max(1, Math.floor(ttlSeconds));
    const redis = this.getRedisClient();

    if (redis) {
      try {
        await redis.set(key, token, 'EX', safeTtl);
        return;
      } catch {
        this.setTokenForCodeFallback(key, token, safeTtl);
        return;
      }
    }

    this.setTokenForCodeFallback(key, token, safeTtl);
  }

  async getTokenForCode(verificationCode: string): Promise<string | null> {
    const key = this.buildCodeKey(verificationCode);
    const redis = this.getRedisClient();

    if (redis) {
      try {
        const token = await redis.get(key);
        return typeof token === 'string' && token.length > 0 ? token : null;
      } catch {
        return this.getTokenForCodeFallback(key);
      }
    }

    return this.getTokenForCodeFallback(key);
  }

  private buildNonceKey(sessionId: string, nonce: string) {
    return `qr:nonce:${sessionId}:${nonce}`;
  }

  private buildCodeKey(verificationCode: string) {
    const normalized = verificationCode
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase();

    if (!normalized) {
      return 'qr:code:INVALID';
    }

    return `qr:code:${normalized}`;
  }

  private getRedisClient(): Redis | null {
    if (!this.redisUrl) {
      return null;
    }

    if (this.redisClient) {
      return this.redisClient;
    }

    this.redisClient = new Redis(this.redisUrl, {
      maxRetriesPerRequest: 2,
      enableAutoPipelining: true,
      lazyConnect: true,
    });

    return this.redisClient;
  }

  private isUsedFallback(key: string) {
    this.purgeExpiredFallback();

    const expiresAt = this.fallbackStore.get(key);

    if (!expiresAt) {
      return false;
    }

    if (expiresAt <= Date.now()) {
      this.fallbackStore.delete(key);
      return false;
    }

    return true;
  }

  private markUsedFallback(key: string, ttlSeconds: number) {
    this.purgeExpiredFallback();
    this.fallbackStore.set(key, Date.now() + ttlSeconds * 1000);
  }

  private setTokenForCodeFallback(
    key: string,
    token: string,
    ttlSeconds: number,
  ) {
    this.purgeExpiredFallback();
    this.fallbackTokenStore.set(key, {
      token,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  private getTokenForCodeFallback(key: string) {
    this.purgeExpiredFallback();

    const entry = this.fallbackTokenStore.get(key);

    if (!entry) {
      return null;
    }

    if (entry.expiresAt <= Date.now()) {
      this.fallbackTokenStore.delete(key);
      return null;
    }

    return entry.token;
  }

  private purgeExpiredFallback() {
    const now = Date.now();

    for (const [key, expiresAt] of this.fallbackStore.entries()) {
      if (expiresAt <= now) {
        this.fallbackStore.delete(key);
      }
    }

    for (const [key, entry] of this.fallbackTokenStore.entries()) {
      if (entry.expiresAt <= now) {
        this.fallbackTokenStore.delete(key);
      }
    }
  }
}
