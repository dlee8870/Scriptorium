import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

interface UpdateCountersAction {
  action: 'add' | 'remove' | 'switch';
  type: 'upvote' | 'downvote';
  prevType?: 'upvote' | 'downvote' | null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const user = await authenticateUser(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { id, type, itemType } = req.body as { id: number; type: 'upvote' | 'downvote'; itemType: 'blogPost' | 'comment' };

  if (!Number.isInteger(id) || !['upvote', 'downvote'].includes(type) || !['blogPost', 'comment'].includes(itemType)) {
    return res.status(400).json({ message: 'Invalid type or itemType' });
  }

  try {
    const target = itemType === 'blogPost'
      ? await prisma.blogPost.findUnique({ where: { id } })
      : await prisma.comment.findUnique({ where: { id } });

    if (!target || target.hidden) {
      return res.status(404).json({ message: 'Content not found' });
    }

    // Check if the vote already exists
    const existingVote = await prisma.vote.findFirst({
      where: {
        userId: user.id,
        blogPostId: itemType === 'blogPost' ? id : null,
        commentId: itemType === 'comment' ? id : null,
      },
    });

    if (existingVote) {
      const previousType = existingVote.type === 'upvote' || existingVote.type === 'downvote'
        ? existingVote.type
        : null;

      // Prevent simultaneous upvote and downvote
      if (existingVote.type === type) {
        // Remove vote (toggle off)
        await prisma.vote.delete({ where: { id: existingVote.id } });
        await updateCounters(id, itemType, { type, action: 'remove' });
        return res.status(200).json({ message: `${type} removed` });
      } else {
        // Switch vote type
        await prisma.vote.update({
          where: { id: existingVote.id },
          data: { type },
        });
        await updateCounters(id, itemType, { type, action: 'switch', prevType: previousType });
        return res.status(200).json({ message: `Vote switched to ${type}` });
      }
    }

    // Create a new vote
    await prisma.vote.create({
      data: {
        type,
        userId: user.id,
        blogPostId: itemType === 'blogPost' ? id : null,
        commentId: itemType === 'comment' ? id : null,
      },
    });

    await updateCounters(id, itemType, { type, action: 'add' });
    return res.status(201).json({ message: `Voted ${type}` });
  } catch (error) {
    console.error('Error processing vote:', error);
    res.status(500).json({ message: 'Failed to process vote' });
  }
}

// Helper function to update vote counters
async function updateCounters(
  id: number,
  itemType: 'blogPost' | 'comment',
  { type, action, prevType }: UpdateCountersAction
): Promise<void> {
  const incrementField = type === 'upvote' ? 'upvotes' : 'downvotes';
  const decrementField = prevType === 'upvote' ? 'upvotes' : 'downvotes';

  const data: Record<string, any> = {};

  if (action === 'add') {
    data[incrementField] = { increment: 1 };
  } else if (action === 'remove') {
    data[incrementField] = { decrement: 1 };
  } else if (action === 'switch') {
    data[incrementField] = { increment: 1 };
    if (decrementField) {
      data[decrementField] = { decrement: 1 };
    }
  }

  if (itemType === 'blogPost') {
    await prisma.blogPost.update({
      where: { id },
      data,
    });
    return;
  }

  await prisma.comment.update({
    where: { id },
    data,
  });
}

