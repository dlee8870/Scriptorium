import { NextApiRequest, NextApiResponse } from 'next';
import { Fields, Files, IncomingForm } from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { authenticateUser } from '@/middleware/auth';
import prisma from '@/utils/db';

// Disable body parsing for this API route
export const config = {
  api: {
    bodyParser: false,
  },
};

// Ensure the upload directory exists
const ensureUploadDir = async (dir: string) => {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
};

// Parse the form using formidable
const parseForm = (req: NextApiRequest) =>
  new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: path.join(process.cwd(), 'public', 'uploads'),
      keepExtensions: true,
      maxFileSize: 5 * 1024 * 1024, // Limit file size to 5 MB
    });

    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const user = await authenticateUser(req);

  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    await ensureUploadDir(uploadDir);

    // Parse the form data
    const { files } = await parseForm(req);
    console.log('Files:', files);

    const uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!uploadedFile) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png'];
    if (!uploadedFile.mimetype || !allowedMimeTypes.includes(uploadedFile.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG and PNG are allowed.' });
    }

    const fileName = `${Date.now()}_${path.basename(uploadedFile.filepath)}`; // Add timestamp to avoid overwrites
    const fileUrl = `/uploads/${fileName}`;

    // Fetch the current user's existing avatar
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatar: true },
    });

    if (existingUser?.avatar && existingUser.avatar !== '/uploads/default.png') {
      const oldFilePath = path.join(process.cwd(), 'public', existingUser.avatar);

      // Delete the old avatar file if it exists and is not default.png
      try {
        await fs.unlink(oldFilePath);
        console.log(`Deleted old avatar: ${existingUser.avatar}`);
      } catch (error) {
        console.warn(
          `Failed to delete old avatar: ${existingUser.avatar}`,
          error instanceof Error ? error.message : error
        );
      }
    }

    // Move the new file to its final location (rename it)
    const newFilePath = path.join(uploadDir, fileName);
    await fs.rename(uploadedFile.filepath, newFilePath);

    // Update the user's avatar in the database
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: fileUrl },
    });

    return res.status(200).json({
      message: 'Avatar updated successfully',
      url: fileUrl,
      user: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    console.error('Error handling avatar update:', error);
    return res.status(500).json({
      message: 'Avatar update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

