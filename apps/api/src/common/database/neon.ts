import { neon } from '@neondatabase/serverless';
import { config as loadDotEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

let envLoaded = false;
let sqlClient: ReturnType<typeof neon> | null = null;

function loadEnvironmentOnce() {
  if (envLoaded) {
    return;
  }

  envLoaded = true;

  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../../.env'),
    resolve(process.cwd(), '../../../.env'),
  ];

  for (const candidate of candidates) {
    if (!existsSync(candidate)) {
      continue;
    }

    loadDotEnv({
      path: candidate,
      override: false,
    });
    break;
  }
}

export function getSql() {
  loadEnvironmentOnce();

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }

  return sqlClient;
}

export function toIsoString(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return new Date(value).toISOString();
}

export function toNullableIsoString(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  return toIsoString(value);
}

export function isDatabaseUniqueViolation(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  return (error as { code?: unknown }).code === '23505';
}

export function escapeLikePattern(value: string) {
  return value.replace(/[\\%_]/g, '\\$&');
}

export function isUuidLike(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
