import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!email || !password || password.length < 12) {
  throw new Error('ADMIN_EMAIL and an ADMIN_PASSWORD of at least 12 characters are required.');
}

try {
  const passwordHash = await bcrypt.hash(
    password,
    Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10)
  );

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN' },
    create: {
      email,
      passwordHash,
      firstName: process.env.ADMIN_FIRST_NAME || 'Admin',
      lastName: process.env.ADMIN_LAST_NAME || 'User',
      role: 'ADMIN',
    },
  });

  console.log(`Admin account is ready: ${email}`);
} finally {
  await prisma.$disconnect();
}
