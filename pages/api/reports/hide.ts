import prisma from '@/utils/db';
import { authenticateAdmin } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const admin = await authenticateAdmin(req);
  if (!admin) {
    return res.status(403).json({ message: 'Forbidden: Admin access only' });
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { blogPostId, commentId }: { blogPostId?: number; commentId?: number } = req.body;
  const hasBlogPostId = Number.isInteger(blogPostId);
  const hasCommentId = Number.isInteger(commentId);

  if (hasBlogPostId === hasCommentId) {
    return res.status(400).json({ message: 'Specify exactly one of blogPostId or commentId' });
  }

  try {
    if (hasBlogPostId) {
      await prisma.blogPost.update({
        where: { id: blogPostId },
        data: { hidden: true },
      });
    } else if (hasCommentId) {
      await prisma.comment.update({
        where: { id: commentId },
        data: { hidden: true },
      });
    }

    res.status(200).json({ message: 'Content hidden successfully' });
  } catch (error) {
    console.error("Error hiding content:", error);
    res.status(500).json({ message: 'Failed to hide content' });
  }
}
