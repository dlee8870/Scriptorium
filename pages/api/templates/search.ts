import prisma from '@/utils/db';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { query = '', page = '1', limit = '10' } = req.query;

    if (typeof query !== 'string') {
        return res.status(400).json({ message: 'Invalid query parameter' });
    }

    try {
        const pageNumber = Math.max(parseInt(String(page), 10) || 1, 1);
        const limitNumber = Math.min(Math.max(parseInt(String(limit), 10) || 10, 1), 50);
        const where = {
            OR: [
                { title: { contains: query } },
                { explanation: { contains: query } },
                { code: { contains: query } },
                { tags: { some: { name: { contains: query } } } },
            ],
        };

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
        console.error("Search Error:", error); 
        res.status(500).json({ message: 'Error searching templates', error });
    }
}
