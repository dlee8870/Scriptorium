import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const user = await authenticateUser(req);

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { page = 1, limit = 10, search = '', sort = 'date' } = req.query;

  // Ensure query parameters are properly typed
  const pageNumber = parseInt(page as string, 10) || 1;
  const limitNumber = parseInt(limit as string, 10) || 10;
  const skip = (pageNumber - 1) * limitNumber;
  const searchQuery = search as string;
  const sortCriteria = sort as 'date' | 'rating';

  try {
    const comments = await prisma.comment.findMany({
      where: {
        AND: [
          user ? { OR: [{ hidden: false }, { userId: user.id }] } : { hidden: false },
          { content: { contains: searchQuery } },
        ],
      },
      include: {
        user: { select: { firstName: true, lastName: true, avatar: true } },
        votes: { where: { userId: user?.id ?? -1 } },
      },
      skip,
      take: limitNumber,
      orderBy: sortCriteria === 'date' ? { createdAt: 'desc' } : undefined,
    });

    // Sort by rating if `sort` is set to 'rating'
    if (sortCriteria === 'rating') {
      comments.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    }

    // Map userVote into the comment objects
    const commentsWithUserVote = comments.map((comment) => {
      const votes = 'votes' in comment && Array.isArray(comment.votes) ? comment.votes : [];
      const userVote = votes.length > 0 ? votes[0].type : null;
      return {
        ...comment,
        userVote, // Add the user's vote type to each comment
      };
    });

    res.status(200).json(commentsWithUserVote);
  } catch (error) {
    console.error('Error retrieving comments:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}





