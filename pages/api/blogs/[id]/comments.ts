import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

export default async function handler(req : any, res : any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { id, sort = 'date' } = req.query;
  const user = await authenticateUser(req);
  const blogPostId = Number(id);

  if (!Number.isInteger(blogPostId)) {
    return res.status(400).json({ message: 'Invalid blog post ID' });
  }

  try {
    // Ensure the blog post exists
    const blogPost = await prisma.blogPost.findUnique({
      where: { id: blogPostId },
      select: { id: true, hidden: true, userId: true },
    });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    if (blogPost.hidden && (!user || (blogPost.userId !== user.id && user.role !== 'ADMIN'))) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    // Fetch all comments for the blog post
    const comments = await prisma.comment.findMany({
      where: {
        blogPostId,
        ...(user ? { OR: [{ hidden: false }, { userId: user.id }] } : { hidden: false }),
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        votes: { where: { userId: user?.id ?? -1 } },
        reports: { select: { reason: true, createdAt: true } },
      },
      orderBy: sort === 'date' ? { createdAt: 'desc' } : undefined, // Default order by date
    });

    // Sort by rating if `sort` is set to 'rating'
    if (sort === 'rating') {
      comments.sort((a, b) => {
        const aRating = a.upvotes - a.downvotes;
        const bRating = b.upvotes - b.downvotes;
        return bRating - aRating;
      });
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
    console.error('Error fetching comments:', error);
    res.status(500).json({ message: 'Failed to fetch comments' });
  }
}


