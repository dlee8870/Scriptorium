import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/db";
import { authenticateUser } from "@/middleware/auth";

interface AuthenticatedUser {
  id: number;
  email: string;
  role?: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  const user: AuthenticatedUser | null = await authenticateUser(req);

  if (!user) {
    res
      .status(401)
      .json({ message: "You are not an authorized user and you are not allowed to do this." });
    return;
  }

  switch (req.method) {
    case "GET":
      return handleGetRequest(res, user);
    case "PUT":
      return handlePutRequest(req, res, user);
    default:
      res.setHeader("Allow", ["GET", "PUT"]);
      res.status(405).json({ message: `Method ${req.method} Not Allowed` });
      return;
  }
}

// Handler to fetch user profile data (GET)
async function handleGetRequest(res: NextApiResponse, user: AuthenticatedUser): Promise<void> {
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        avatar: true,
        phoneNumber: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!userProfile) {
      res.status(404).json({ message: "User profile not found" });
      return;
    }

    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Failed to fetch user profile:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
}

// Handler to update user profile data (PUT)
async function handlePutRequest(
  req: NextApiRequest,
  res: NextApiResponse,
  user: AuthenticatedUser
): Promise<void> {
  const { firstName, lastName, avatar, phoneNumber } = req.body as {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    phoneNumber?: string;
  };

  try {
    const updatedProfile = await prisma.user.update({
      where: { id: user.id },
      data: {
        firstName,
        lastName,
        avatar,
        phoneNumber,
        updatedAt: new Date(),
      },
    });

    res.status(200).json({ message: "Profile updated successfully", user: updatedProfile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
}
