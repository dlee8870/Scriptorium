import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { inferTemplateLanguage, isSupportedLanguage, SupportedLanguage } from '@/utils/languages';

interface UpdateTemplateRequestBody {
  title: string;
  code: string;
  explanation: string;
  tags: string[];
  language: SupportedLanguage;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const templateId = Number(id);

    if (!Number.isInteger(templateId)) {
        return res.status(400).json({ message: 'Invalid template ID' });
    }

    if (req.method === 'GET') {
        try {
            const template = await prisma.template.findUnique({
                where: { id: templateId },
                include: {
                    tags: true,
                    blogPosts: {
                        where: { hidden: false },
                        select: {
                            id: true,
                            title: true,
                            description: true,
                            createdAt: true,
                            user: { select: { firstName: true, lastName: true, avatar: true } },
                        },
                    },
                },
            });

            if (!template) return res.status(404).json({ message: 'Template not found' });
            res.status(200).json({ ...template, language: inferTemplateLanguage(template) });
        } catch (error) {
            res.status(500).json({ message: 'Error retrieving template', error });
        }
    }
    else if (req.method === 'PUT') {
        const user = await authenticateUser(req);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const { title, code, explanation, tags, language } = req.body as UpdateTemplateRequestBody;

        if (!title?.trim() || !code?.trim() || !Array.isArray(tags) || !isSupportedLanguage(language)) {
            return res.status(400).json({ message: 'Title, code, tags, and a supported language are required' });
        }

        try {
            const template = await prisma.template.findUnique({ where: { id: templateId } });
            if (!template) return res.status(404).json({ message: 'Template not found' });
            if (template.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });

            const updatedTemplate = await prisma.template.update({
                where: { id: templateId },
                data: {
                    title, 
                    code,
                    language,
                    explanation,
                    tags: {
                        set: [],
                        connectOrCreate: tags.filter(Boolean).map(tag => ({
                            where: { name: tag },
                            create: { name: tag }
                        })),
                    },
                },
            });
            res.status(200).json(updatedTemplate);
        } catch (error) {
            res.status(500).json({ message: 'Error updating template', error });
        }
    } else if (req.method === 'DELETE') {
        const user = await authenticateUser(req);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const template = await prisma.template.findUnique({
                where: { id: templateId },
            });
            if (!template) return res.status(404).json({ message: 'Template not found' });
            if (template.userId !== user.id) return res.status(403).json({ message: 'Forbidden' });

            await prisma.template.delete({
                where: { id: templateId },
            });
            res.status(204).end();
        } catch (error) {
            res.status(500).json({ message: 'Error deleting template', error});
        }
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE', 'GET']);
        res.status(405).end(`Method ${req.method} Not allowed`);
    }
}
