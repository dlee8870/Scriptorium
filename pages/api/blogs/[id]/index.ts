import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';

export default async function handler(req : any, res : any) {
  const user = await authenticateUser(req);

  const { id } = req.query;
  const blogPostId = Number(id);

  if (!Number.isInteger(blogPostId)) {
    return res.status(400).json({ message: 'Invalid blog post ID' });
  }

  switch (req.method) {
    case 'GET':
      return handleGetBlogPostById(res, blogPostId, user);
    case 'PUT':
      return handleUpdateBlogPost(req, res, blogPostId, user);
    case 'DELETE':
      return handleDeleteBlogPost(res, blogPostId, user);
    default:
      res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
      return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}

// Fetch a single blog post by ID
async function handleGetBlogPostById(res : any, id: number, user: any) {
  try {
    const blogPost = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        tags: true,
        templates: true,
        reports: { select: { reason: true, createdAt: true } },
        votes: user
          ? { where: { userId: user.id }, select: { type: true }, take: 1 }
          : false,
        comments: {
          where: user
            ? { OR: [{ hidden: false }, { userId: user.id }] }
            : { hidden: false },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
            reports: { select: { reason: true, createdAt: true } },
          },
        },
      },
    });

    if (!blogPost) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    if (blogPost.hidden && (!user || (blogPost.userId !== user.id && user.role !== 'ADMIN'))) {
      return res.status(404).json({ message: 'Blog post not found' });
    }

    const userVote = 'votes' in blogPost ? blogPost.votes[0]?.type || null : null;
    const postWithoutVotes: Record<string, unknown> = { ...blogPost };
    delete postWithoutVotes.votes;
    res.status(200).json({ ...postWithoutVotes, userVote });
  } catch (error) {
    console.error("Error retrieving blog post:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Update a blog post by ID
async function handleUpdateBlogPost(req : any, res : any, id : number, user : any) {
  const { title, description, tags = [], templateIds = [] } = req.body;
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (!title?.trim() || !description?.trim() || !Array.isArray(tags) || !Array.isArray(templateIds)) {
    return res.status(400).json({ message: 'Title, description, tags, and templateIds are required' });
  }

  try {
    // Verify ownership
    const blogPost = await prisma.blogPost.findUnique({ where: { id } });
    if (!blogPost || blogPost.userId !== user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    if (blogPost.hidden) {
      return res.status(403).json({ message: 'Hidden posts cannot be edited' });
    }

    const uniqueTemplateIds = [...new Set(templateIds)];
    if (uniqueTemplateIds.some((templateId) => !Number.isInteger(templateId))) {
      return res.status(400).json({ message: 'Template IDs must be integers' });
    }
    const existingTemplateCount = await prisma.template.count({
      where: { id: { in: uniqueTemplateIds } },
    });
    if (existingTemplateCount !== uniqueTemplateIds.length) {
      return res.status(400).json({ message: 'One or more template IDs do not exist' });
    }
    const normalizedTags = [...new Set(tags.map((tag: string) => tag.trim()).filter(Boolean))];

    const updatedPost = await prisma.blogPost.update({
      where: { id },
      data: {
        title,
        description,
        tags: {
          set: [], // Clear existing tags
          connectOrCreate: normalizedTags.map((tag) => ({
            where: { name: tag },
            create: { name: tag },
          })),
        },
        templates: {
          set: uniqueTemplateIds.map((templateId) => ({ id: templateId })),
        },
      },
    });

    res.status(200).json({ message: 'Blog post updated successfully', blogPost: updatedPost });
  } catch (error) {
    console.error("Error updating blog post:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

// Delete a blog post by ID
async function handleDeleteBlogPost(res : any, id : number, user : any) {
  try {
    const blogPost = await prisma.blogPost.findUnique({ where: { id } });
    if (!user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is the owner
    if (!blogPost || blogPost.userId !== user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await prisma.blogPost.delete({ where: { id } });
    res.status(200).json({ message: 'Blog post deleted successfully' });
  } catch (error) {
    console.error("Error deleting blog post:", error);
    res.status(500).json({ message: 'Internal server error' });
  }
}
