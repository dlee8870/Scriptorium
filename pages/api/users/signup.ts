import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/db";
import { hashPassword } from "@/utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "POST") {
    const { firstName, lastName, email, password, avatar, phoneNumber } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      avatar?: string;
      phoneNumber?: string;
    };

    // Basic validations
    if (!firstName || !lastName || !email || !password) {
      res.status(400).json({ message: "All required fields must be provided" });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    // Password strength validation (example: minimum 8 characters)
    if (password.length < 4) {
      res.status(400).json({ message: "Password must be at least 4 characters long" });
      return;
    }

    try {
      // Check if user with the email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(400).json({ message: "This email is already taken" });
        return;
      }

      // Create the new user
      const newUser = await prisma.user.create({
        data: {
          firstName,
          lastName,
          email,
          passwordHash: await hashPassword(password), // Updated to match schema
          avatar,
          phoneNumber,
        },
      });

      // Exclude sensitive data
      const { id, createdAt, updatedAt } = newUser;

      res.status(201).json({
        message: "User created successfully",
        user: {
          id,
          firstName,
          lastName,
          email,
          avatar,
          phoneNumber,
          createdAt,
          updatedAt,
        },
      });
    } catch (error: unknown) {
      console.error("Error occurred during signup:", error);
      res.status(500).json({ message: "Something went wrong", error });
    }
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}
