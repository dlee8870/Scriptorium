import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/db";
import { comparePassword, generateToken } from "@/utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ message: 'Method not allowed' });
    return;
  }

  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({
      message: "Email and password are required.",
    });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      res.status(401).json({
        message: "Invalid credentials.",
      });
      return;
    }

    const token = generateToken({ userId: user.id, email: user.email });

    const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
    res.setHeader('Set-Cookie', `token=${token}; Max-Age=3600; path=/; HttpOnly${secureFlag}; SameSite=Lax`);

    res.status(200).json({
      token,
      firstname: user.firstName,
      lastname: user.lastName,
    });
  } catch (error: unknown) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error.' });
  }
}
