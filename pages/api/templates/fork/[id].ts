import prisma from '@/utils/db';
import { authenticateUser } from '@/middleware/auth';
import { NextApiRequest, NextApiResponse } from 'next';
import { inferTemplateLanguage } from '@/utils/languages';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const user = await authenticateUser(req);
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const { id } = req.query;

    if (req.method === 'POST') {
        try {
            const templateToFork = await prisma.template.findUnique({
                where: { id: Number(id) },
                include: { tags: true },
            });

            if (!templateToFork) return res.status(404).json({ message: 'Template not found' });

            const forkedTemplate = await prisma.template.create({
                data: {
                    title: `${templateToFork.title} (Fork)`,
                    explanation: templateToFork.explanation,
                    code: templateToFork.code,
                    language: inferTemplateLanguage(templateToFork),
                    user: { connect: { id: user.id } },
                    tags: {
                        connect: templateToFork.tags.map(tag => ({ id: tag.id })),
                    },
                },
            });

            res.status(201).json(forkedTemplate);
        } catch (error) {
            res.status(500).json({ message: 'Error forking template', error });
        }
    } else {
        res.setHeader("Allow", ["POST"]);
        res.status(405).end(`Method ${req.method} not allowed`);
    }
}
