import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const user = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'DELETE') {
    res.setHeader('Allow', ['DELETE']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Invalid comment ID' });
  }

  try {
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(id, 10) },
    });

    if (!comment || comment.userId !== user.id) {
      return res.status(403).json({ message: 'Not allowed to delete this comment' });
    }

    await prisma.comment.delete({
      where: { id: parseInt(id, 10) },
    });

    return res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return res.status(500).json({ message: 'Failed to delete comment' });
  }
}
