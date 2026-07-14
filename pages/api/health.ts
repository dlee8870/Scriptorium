import prisma from '@/utils/db';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ status: 'error', message: 'Method not allowed' });
  }

  try {
    await prisma.$queryRaw`SELECT 1`;
    return res.status(200).json({
      status: 'ok',
      database: 'connected',
      executionService: process.env.EXECUTION_API_URL ? 'configured' : 'local',
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return res.status(503).json({ status: 'error', database: 'unavailable' });
  }
}
