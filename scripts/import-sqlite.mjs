import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const inputPath = path.resolve(process.argv[2] || 'prisma/sqlite-export.json');
const asDate = (value) => new Date(value);

try {
  const data = JSON.parse(await readFile(inputPath, 'utf8'));
  const existingUsers = await prisma.user.count();

  if (existingUsers > 0) {
    throw new Error('The destination database is not empty. Import was cancelled.');
  }

  await prisma.$transaction(async (tx) => {
    for (const user of data.users) {
      await tx.user.create({
        data: {
          ...user,
          createdAt: asDate(user.createdAt),
          updatedAt: asDate(user.updatedAt),
        },
      });
    }

    if (data.tags.length) await tx.tag.createMany({ data: data.tags });

    for (const { tags, ...template } of data.templates) {
      await tx.template.create({
        data: {
          ...template,
          createdAt: asDate(template.createdAt),
          updatedAt: asDate(template.updatedAt),
          tags: { connect: tags.map(({ id }) => ({ id })) },
        },
      });
    }

    for (const { tags, templates, ...blogPost } of data.blogPosts) {
      await tx.blogPost.create({
        data: {
          ...blogPost,
          createdAt: asDate(blogPost.createdAt),
          updatedAt: asDate(blogPost.updatedAt),
          tags: { connect: tags.map(({ id }) => ({ id })) },
          templates: { connect: templates.map(({ id }) => ({ id })) },
        },
      });
    }

    for (const comment of data.comments) {
      await tx.comment.create({
        data: {
          ...comment,
          createdAt: asDate(comment.createdAt),
          updatedAt: asDate(comment.updatedAt),
        },
      });
    }

    for (const report of data.reports) {
      await tx.report.create({
        data: { ...report, createdAt: asDate(report.createdAt) },
      });
    }

    for (const vote of data.votes) {
      await tx.vote.create({
        data: { ...vote, createdAt: asDate(vote.createdAt) },
      });
    }

    for (const table of ['User', 'Tag', 'Template', 'BlogPost', 'Comment', 'Report', 'Vote']) {
      await tx.$executeRawUnsafe(
        `SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM "${table}"`
      );
    }
  }, { maxWait: 10_000, timeout: 120_000 });

  console.log(`Imported SQLite data from ${inputPath}`);
} finally {
  await prisma.$disconnect();
}
