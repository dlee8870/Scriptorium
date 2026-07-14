import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const user = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;
  const { content } = req.body;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid comment ID' });
  }

  if (!content || typeof content !== 'string') {
    return res.status(400).json({ message: 'Content is required and must be a string' });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!comment || comment.userId !== user.id) {
      return res.status(403).json({ message: 'Not allowed to edit this comment' });
    }

    if (comment.hidden) {
      return res.status(403).json({ message: 'Hidden comments cannot be edited' });
    }

    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(id, 10) },
      data: { content: content.trim() },
    });

    return res.status(200).json({ message: 'Comment updated successfully', comment: updatedComment });
  } catch (error) {
    console.error('Error updating comment:', error);
    return res.status(500).json({ message: 'Failed to update comment' });
  }
}
