import { NextApiRequest, NextApiResponse } from 'next';
import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  switch (req.method) {
    case 'POST':
      const user = await authenticateUser(req);
      return handleCreateBlogPost(req, res, user);
    case 'GET':
      return handleGetBlogPosts(req, res);
    default:
      res.setHeader('Allow', ['POST', 'GET']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Create a new blog post
async function handleCreateBlogPost(
  req: NextApiRequest,
  res: NextApiResponse,
  user: { id: number } | null
): Promise<void> {
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const { title, description, tags = [], templateIds = [] }: { title: string; description: string; tags?: string[]; templateIds?: number[] } = req.body;

  if (!title?.trim() || !description?.trim()) {
    return res.status(400).json({ message: 'Title and description are required' });
  }

  if (!Array.isArray(tags) || !Array.isArray(templateIds) || templateIds.some((id) => !Number.isInteger(id))) {
    return res.status(400).json({ message: 'Tags and templateIds must be arrays' });
  }

  try {
    const uniqueTemplateIds = [...new Set(templateIds)];
    const existingTemplateCount = await prisma.template.count({
      where: { id: { in: uniqueTemplateIds } },
    });
    if (existingTemplateCount !== uniqueTemplateIds.length) {
      return res.status(400).json({ message: 'One or more template IDs do not exist' });
    }

    const normalizedTags = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))];
    const blogPost = await prisma.blogPost.create({
      data: {
        title,
        description,
        userId: user.id,
        tags: {
          connectOrCreate: normalizedTags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
        templates: {
          connect: uniqueTemplateIds.map((id) => ({ id })),
        },
      },
    });

    return res.status(201).json({ message: 'Blog post created successfully', blogPost });
  } catch (error) {
    console.error('Error creating blog post:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
}

// Retrieve blog posts with pagination, search, and sort
async function handleGetBlogPosts(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const user = await authenticateUser(req);
  const { page = '1', limit = '10', search = '', sort = 'date' } = req.query;
  const pageNumber = Math.max(parseInt(String(page), 10) || 1, 1);
  const limitNumber = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
  const searchQuery = String(search).trim();
  const skip = (pageNumber - 1) * limitNumber;

  const visibilityFilter = user
    ? { OR: [{ hidden: false }, { userId: user.id }] }
    : { hidden: false };

  const searchFilter = searchQuery
    ? {
        OR: [
          { title: { contains: searchQuery } },
          { description: { contains: searchQuery } },
          { tags: { some: { name: { contains: searchQuery } } } },
          { templates: { some: { title: { contains: searchQuery } } } },
          { templates: { some: { explanation: { contains: searchQuery } } } },
          { templates: { some: { code: { contains: searchQuery } } } },
        ],
      }
    : {};

  try {
    const where = {
      AND: [visibilityFilter, searchFilter],
    };

    const allMatchingPosts = await prisma.blogPost.findMany({
      where,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        tags: true,
        templates: true,
        reports: { select: { reason: true, createdAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (sort === 'rating') {
      allMatchingPosts.sort((a, b) => (b.upvotes - b.downvotes) - (a.upvotes - a.downvotes));
    }

    const totalCount = allMatchingPosts.length;
    const blogPosts = allMatchingPosts.slice(skip, skip + limitNumber);

    res.status(200).json({ blogPosts, totalCount });
  } catch (error) {
    console.error('Error retrieving blog posts:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
