import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { isSupportedLanguage, SupportedLanguage } from '@/utils/languages';

interface CreateTemplateRequestBody {
  title: string;
  code: string;
  explanation: string;
  tags: string[];
  language: SupportedLanguage;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const user = await authenticateUser(req);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        const { title, code, explanation, tags = [], language } = req.body as CreateTemplateRequestBody;

        if (!title?.trim() || !code?.trim() || !Array.isArray(tags) || !isSupportedLanguage(language)) {
            return res.status(400).json({ message: 'Title, code, tags, and a supported language are required' });
        }

        try {
            const newTemplate = await prisma.template.create({
                data: {
                    title,
                    code,
                    language,
                    explanation,
                    user: { connect: { id: user.id } },
                    tags: {
                        connectOrCreate: tags.filter(Boolean).map((tag) => ({
                            where: { name: tag },
                            create: { name: tag },
                        })),
                    },
                },
            });
            return res.status(201).json(newTemplate);
        } catch (error) {
            console.error('Error creating template:', error);
            return res.status(500).json({ message: 'Error creating template', error });
        }
    } else if (req.method === 'GET') {
        const user = await authenticateUser(req);
        if (!user) return res.status(401).json({ message: 'Unauthorized' });

        try {
            const templates = await prisma.template.findMany({
                where: { userId: user.id },
                include: { tags: true },
                orderBy: { createdAt: 'desc' },
            });
            return res.status(200).json(templates);
        } catch (error) {
            console.error('Error retrieving templates:', error);
            return res.status(500).json({ message: 'Error retrieving templates', error });
        }
    } else {
        res.setHeader('Allow', ['POST', 'GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
