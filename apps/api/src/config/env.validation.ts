import { z } from 'zod';

const optionalUrl = z.preprocess((value) => {
  if (typeof value !== 'string') {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}, z.string().url().optional());

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: optionalUrl,
  QR_SECRET: z.string().min(16),
  QR_ROTATION_SECONDS: z.coerce.number().int().min(15).max(300).default(60),
  QR_RADIUS_GRACE_METERS: z.coerce.number().min(0).default(12),
  NEON_AUTH_BASE_URL: optionalUrl,
  SENTRY_DSN: optionalUrl,
  AUTH_COOKIE_NAME: z.string().default('session'),
  PARTICIPANT_COOKIE_NAME: z.string().default('participant_session'),
  DEMO_ADMIN_NAME: z.string().min(1).optional(),
  DEMO_ADMIN_USERNAME: z.string().min(1).optional(),
  DEMO_ADMIN_EMAIL: z.string().email().optional(),
  DEMO_ADMIN_PASSWORD: z.string().min(1).optional(),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Environment validation error: ${parsed.error.message}`);
  }

  return parsed.data;
}
