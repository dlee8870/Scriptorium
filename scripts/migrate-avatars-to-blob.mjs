import { put } from '@vercel/blob';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  throw new Error('BLOB_READ_WRITE_TOKEN is required.');
}

const prisma = new PrismaClient();

try {
  const users = await prisma.user.findMany({
    where: {
      avatar: { startsWith: '/uploads/' },
      NOT: { avatar: '/uploads/default.png' },
    },
    select: { id: true, avatar: true },
  });

  for (const user of users) {
    const localPath = path.join(process.cwd(), 'public', user.avatar.replace(/^\/+/, ''));
    const extension = path.extname(localPath).toLowerCase();
    const contentType = extension === '.png' ? 'image/png' : 'image/jpeg';

    try {
      const blob = await put(`avatars/${user.id}/avatar${extension || '.jpg'}`, await readFile(localPath), {
        access: 'public',
        addRandomSuffix: true,
        contentType,
      });
      await prisma.user.update({ where: { id: user.id }, data: { avatar: blob.url } });
      console.log(`Migrated avatar for user ${user.id}`);
    } catch (error) {
      console.warn(`Skipped avatar for user ${user.id}:`, error instanceof Error ? error.message : error);
    }
  }
} finally {
  await prisma.$disconnect();
}
