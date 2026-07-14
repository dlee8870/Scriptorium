import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { PrismaClient } from '../generated/sqlite-client/index.js';

const prisma = new PrismaClient();
const outputPath = path.resolve(process.argv[2] || 'prisma/sqlite-export.json');

try {
  const [users, tags, templates, blogPosts, comments, reports, votes] = await Promise.all([
    prisma.user.findMany({ orderBy: { id: 'asc' } }),
    prisma.tag.findMany({ orderBy: { id: 'asc' } }),
    prisma.template.findMany({ include: { tags: true }, orderBy: { id: 'asc' } }),
    prisma.blogPost.findMany({
      include: { tags: true, templates: true },
      orderBy: { id: 'asc' },
    }),
    prisma.comment.findMany({ orderBy: { id: 'asc' } }),
    prisma.report.findMany({ orderBy: { id: 'asc' } }),
    prisma.vote.findMany({ orderBy: { id: 'asc' } }),
  ]);

  await writeFile(
    outputPath,
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        users,
        tags,
        templates,
        blogPosts,
        comments,
        reports,
        votes,
      },
      null,
      2
    ),
    'utf8'
  );

  console.log(`Exported SQLite data to ${outputPath}`);
} finally {
  await prisma.$disconnect();
}
