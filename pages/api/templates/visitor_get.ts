import prisma from '@/utils/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'GET') {
        try {
            const { page = '1', limit = '50', search = '' } = req.query;
            const pageNumber = Math.max(parseInt(String(page), 10) || 1, 1);
            const limitNumber = Math.min(Math.max(parseInt(String(limit), 10) || 50, 1), 100);
            const searchQuery = String(search).trim();
            const where = searchQuery
                ? {
                    OR: [
                        { title: { contains: searchQuery } },
                        { explanation: { contains: searchQuery } },
                        { code: { contains: searchQuery } },
                        { tags: { some: { name: { contains: searchQuery } } } },
                    ],
                }
                : {};

            const totalCount = await prisma.template.count({ where });
            const templates = await prisma.template.findMany({
                where,
                include: { tags: true },
                skip: (pageNumber - 1) * limitNumber,
                take: limitNumber,
                orderBy: { createdAt: 'desc' },
            });
            res.status(200).json({ templates, totalCount });
        } catch (error) {
            res.status(500).json({ message: "Error retrieving templates", error });
        }
    } else {
        res.setHeader('Allow', ['GET']);
        res.status(405).end(`Method ${req.method} Not allowed`);
    }
}
