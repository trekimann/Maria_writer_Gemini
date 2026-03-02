/**
 * Prisma Seed — creates the initial admin account.
 *
 * Configure via .env:
 *   ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME
 *
 * Run:  npm run seed
 * Safe to run multiple times (upsert by email).
 */

import { PrismaClient, UserRole, UserTier } from '@prisma/client';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email       = process.env.ADMIN_EMAIL;
  const username    = process.env.ADMIN_USERNAME;
  const password    = process.env.ADMIN_PASSWORD;
  const displayName = process.env.ADMIN_DISPLAY_NAME ?? 'Admin';

  if (!email || !username || !password) {
    console.error(
      'Missing required env vars: ADMIN_EMAIL, ADMIN_USERNAME, ADMIN_PASSWORD'
    );
    process.exit(1);
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  let admin;
  if (existing) {
    // Account already exists (e.g. registered via UI) — only promote to ADMIN,
    // leave password, username, and displayName untouched.
    admin = await prisma.user.update({
      where: { email },
      data:  { role: UserRole.ADMIN },
    });
    console.log(`✓ Existing account promoted to ADMIN: ${admin.email} (id: ${admin.id})`);
  } else {
    // Fresh install — create the admin account from .env values.
    const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
    const passwordHash = await bcrypt.hash(password, rounds);

    admin = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        displayName,
        role: UserRole.ADMIN,
        tier: UserTier.DEFAULT,
      },
    });
    console.log(`✓ Admin account created: ${admin.email} (id: ${admin.id})`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
