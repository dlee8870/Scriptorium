import prisma from '@/utils/db';
import { authenticateAdmin } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  const admin = await authenticateAdmin(req);
  if (!admin) {
    return res.status(403).json({ message: 'Forbidden: Admin access only' });
  }

  try {
    const reportedPosts = await prisma.blogPost.findMany({
      where: { reports: { some: {} } },
      include: {
        reports: true,
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { reports: { _count: 'desc' } },
    });

    const reportedComments = await prisma.comment.findMany({
      where: { reports: { some: {} } },
      include: {
        reports: true,
        user: { select: { firstName: true, lastName: true, avatar: true } },
      },
      orderBy: { reports: { _count: 'desc' } },
    });

    res.status(200).json({ reportedPosts, reportedComments });
  } catch (error) {
    console.error("Error retrieving reported content:", error);
    res.status(500).json({ message: 'Failed to retrieve reported content' });
  }
}