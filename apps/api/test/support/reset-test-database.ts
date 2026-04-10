import { config as loadDotEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { neon } from '@neondatabase/serverless';

let initialized = false;

function ensureEnvironmentLoaded() {
  if (initialized) {
    return;
  }

  initialized = true;

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

export async function resetTestDatabase() {
  ensureEnvironmentLoaded();

  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for API tests.');
  }

  const sql = neon(databaseUrl);

  await sql.query(`
    truncate table
      export_jobs,
      audit_logs,
      attendance_attempts,
      attendance_records,
      participants,
      sessions,
      events
    restart identity cascade
  `);
}
