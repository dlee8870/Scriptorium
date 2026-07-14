import jwt from 'jsonwebtoken';
import prisma from '@/utils/db';
import { NextApiRequest } from 'next';
import { getJwtSecret } from '@/utils/serverEnv';

interface DecodedToken {
  userId: number;
}

function getToken(req: NextApiRequest): string | null {
  const authorization = req.headers.authorization;
  if (authorization?.startsWith('Bearer ')) {
    return authorization.split(' ')[1];
  }

  return req.cookies?.token || null;
}

// Middleware to authenticate a user
export async function authenticateUser(req: NextApiRequest): Promise<null | { id: number; email: string; role: string }> {
  try {
    const token = getToken(req);
    if (!token) return null;

    const decoded = jwt.verify(token, getJwtSecret()) as DecodedToken;

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });

    if (!user) throw new Error("User not found");
    return user;
  } catch (error) {
    console.error("User authentication failed:", error);
    return null;
  }
}

// Middleware to authenticate an admin
export async function authenticateAdmin(req: NextApiRequest): Promise<null | { id: number; email: string; role: string }> {
  const user = await authenticateUser(req);
  if (user && user.role === 'ADMIN') {
    return user;
  }
  return null;
}
