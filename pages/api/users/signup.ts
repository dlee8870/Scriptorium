import { NextApiRequest, NextApiResponse } from "next";
import prisma from "@/utils/db";
import { hashPassword } from "@/utils/auth";

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === "POST") {
    const { firstName, lastName, email, password, phoneNumber } = req.body as {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      phoneNumber?: string;
    };
    const normalizedEmail = email?.trim().toLowerCase();

    // Basic validations
    if (!firstName?.trim() || !lastName?.trim() || !normalizedEmail || !password) {
      res.status(400).json({ message: "All required fields must be provided" });
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      res.status(400).json({ message: "Invalid email format" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters long" });
      return;
    }

    try {
      // Check if user with the email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });

      if (existingUser) {
        res.status(400).json({ message: "This email is already taken" });
        return;
      }

      // Create the new user
      const newUser = await prisma.user.create({
        data: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: normalizedEmail,
          passwordHash: await hashPassword(password), // Updated to match schema
          phoneNumber,
        },
      });

      // Exclude sensitive data
      const { id, createdAt, updatedAt } = newUser;

      res.status(201).json({
        message: "User created successfully",
        user: {
          id,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          avatar: newUser.avatar,
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
