import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { reason, blogPostId, commentId }: { reason: string; blogPostId?: number; commentId?: number } = req.body;
  const hasBlogPostId = Number.isInteger(blogPostId);
  const hasCommentId = Number.isInteger(commentId);

  if (!reason?.trim() || hasBlogPostId === hasCommentId) {
    return res.status(400).json({ message: 'Reason and exactly one target are required' });
  }

  try {
    if (hasBlogPostId) {
      const blogPost = await prisma.blogPost.findUnique({ where: { id: blogPostId } });
      if (!blogPost || blogPost.hidden) {
        return res.status(404).json({ message: 'Blog post not found' });
      }
    }

    if (hasCommentId) {
      const comment = await prisma.comment.findUnique({ where: { id: commentId } });
      if (!comment || comment.hidden) {
        return res.status(404).json({ message: 'Comment not found' });
      }
    }

    const report = await prisma.report.create({
      data: {
        reason: reason.trim(),
        userId: user.id,
        blogPostId: hasBlogPostId ? blogPostId : null,
        commentId: hasCommentId ? commentId : null,
      },
    });

    res.status(201).json({ message: 'Report submitted successfully', report });
  } catch (error) {
    console.error("Error creating report:", error);
    res.status(500).json({ message: 'Failed to submit report' });
  }
}
