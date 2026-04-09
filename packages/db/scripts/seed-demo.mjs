import { createHash, randomUUID } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

const currentDir = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(currentDir, "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required for db:seed");
}

const sql = neon(databaseUrl);

const DEMO_ADMIN_ID = "f6a2e344-29f5-4a56-bffc-f10d95a9f001";
const DEMO_EVENT_ID = "11f2e30a-84b4-4728-ad65-3e66e14a8201";
const DEMO_SESSION_ID = "8a6c7af4-fdb5-4de7-9e6b-2b818ca74952";

const DEMO_ADMIN_NAME = process.env.DEMO_ADMIN_NAME ?? "Demo Admin";
const DEMO_ADMIN_EMAIL =
  process.env.DEMO_ADMIN_EMAIL ?? "demo.admin@qrattendance.local";
const DEMO_ADMIN_PASSWORD =
  process.env.DEMO_ADMIN_PASSWORD ?? "DemoAdmin123!";

function buildParticipantName(index) {
  return `Demo Katilimci ${String(index).padStart(2, "0")}`;
}

function buildParticipantEmail(index) {
  return `demo.participant${String(index).padStart(2, "0")}@example.com`;
}

function buildParticipantPhone(index) {
  return `+90555000${String(index).padStart(4, "0")}`;
}

async function seedDemoData() {
  const now = Date.now();
  const startsAt = new Date(now - 15 * 60 * 1000).toISOString();
  const endsAt = new Date(now + 2 * 60 * 60 * 1000).toISOString();
  const passwordHash = createHash("sha256")
    .update(DEMO_ADMIN_PASSWORD)
    .digest("hex");

  const adminRows = await sql`
    insert into admins (id, email, password_hash, name, role, created_at)
    values (${DEMO_ADMIN_ID}, ${DEMO_ADMIN_EMAIL}, ${passwordHash}, ${DEMO_ADMIN_NAME}, 'admin', now())
    on conflict (email)
    do update set
      name = excluded.name,
      password_hash = excluded.password_hash,
      role = 'admin'
    returning id
  `;

  const adminId = adminRows[0]?.id ?? DEMO_ADMIN_ID;

  await sql`delete from attendance_attempts where session_id = ${DEMO_SESSION_ID}`;
  await sql`delete from attendance_records where session_id = ${DEMO_SESSION_ID}`;
  await sql`delete from participants where event_id = ${DEMO_EVENT_ID}`;
  await sql`delete from sessions where id = ${DEMO_SESSION_ID}`;
  await sql`delete from events where id = ${DEMO_EVENT_ID}`;

  await sql`
    insert into events (
      id,
      name,
      description,
      location_name,
      latitude,
      longitude,
      radius_meters,
      starts_at,
      ends_at,
      created_by,
      status,
      created_at
    )
    values (
      ${DEMO_EVENT_ID},
      'QR Yoklama Demo Etkinligi',
      'Demo sunumu icin otomatik uretilen etkinlik kaydi',
      'Istanbul Kongre Merkezi',
      41.042028,
      28.986263,
      250,
      ${startsAt},
      ${endsAt},
      ${adminId},
      'active',
      now()
    )
  `;

  await sql`
    insert into sessions (
      id,
      event_id,
      name,
      starts_at,
      ends_at,
      created_at
    )
    values (
      ${DEMO_SESSION_ID},
      ${DEMO_EVENT_ID},
      'Ana Oturum',
      ${startsAt},
      ${endsAt},
      now()
    )
  `;

  for (let index = 1; index <= 20; index += 1) {
    const source = index <= 10 ? "csv" : "manual";

    await sql`
      insert into participants (
        id,
        event_id,
        name,
        email,
        phone,
        source,
        external_id,
        created_at
      )
      values (
        ${randomUUID()},
        ${DEMO_EVENT_ID},
        ${buildParticipantName(index)},
        ${buildParticipantEmail(index)},
        ${buildParticipantPhone(index)},
        ${source},
        ${`DEMO-${String(index).padStart(3, "0")}`},
        now()
      )
    `;
  }

  console.log("Demo verisi hazirlandi.");
  console.log(`Admin: ${DEMO_ADMIN_EMAIL}`);
  console.log("Etkinlik: QR Yoklama Demo Etkinligi");
  console.log("Oturum: Ana Oturum");
  console.log("Katilimci sayisi: 20");
}

seedDemoData().catch((error) => {
  console.error("db:seed calisirken hata olustu:", error);
  process.exitCode = 1;
});