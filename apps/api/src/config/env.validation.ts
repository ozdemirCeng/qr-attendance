import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_PORT: z.coerce.number().default(3001),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().url(),
  QR_SECRET: z.string().min(16),
  QR_ROTATION_SECONDS: z.coerce.number().int().min(15).max(300).default(60),
  NEON_AUTH_BASE_URL: z.string().url(),
  SENTRY_DSN: z.string().url().optional(),
  AUTH_COOKIE_NAME: z.string().default('session'),
});

export function validateEnv(config: Record<string, unknown>) {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    throw new Error(`Environment validation error: ${parsed.error.message}`);
  }

  return parsed.data;
}
