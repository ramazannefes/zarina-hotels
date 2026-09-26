// Secure first-admin bootstrap.
// Usage: npm run admin:create
// Creates a one-time setup token (valid 24h) and prints the setup URL.
// NO default passwords are ever created.

import { randomBytes, createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_BOOTSTRAP_EMAIL ?? "").toLowerCase();
  if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) {
    console.error("Set ADMIN_BOOTSTRAP_EMAIL in .env (the owner's email). Aborting.");
    process.exit(1);
  }

  let admin = await db.adminUser.findUnique({ where: { email } });
  if (!admin) {
    admin = await db.adminUser.create({
      data: {
        email,
        name: process.env.ADMIN_BOOTSTRAP_NAME ?? "Owner",
        role: "SUPER_ADMIN",
        passwordHash: "SETUP_PENDING",
        isActive: false,
      },
    });
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db.adminPasswordReset.create({
    data: {
      adminId: admin.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";
  console.info(`
════════════════════════════════════════════════════════
 One-time admin setup link (valid 24h, single use):

 ${base}/admin/setup?token=${token}

 Share this link securely (e.g. password manager) — it grants
 one password creation for: ${email}
════════════════════════════════════════════════════════
`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
