import { del, put } from '@vercel/blob';
import { authenticateUser } from '@/middleware/auth';
import prisma from '@/utils/db';
import { Fields, Files, File as FormidableFile, IncomingForm } from 'formidable';
import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';

export const config = {
  api: {
    bodyParser: false,
  },
};

const DEFAULT_AVATAR = '/uploads/default.png';
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);

const parseForm = (req: NextApiRequest) =>
  new Promise<{ fields: Fields; files: Files }>((resolve, reject) => {
    const form = new IncomingForm({
      uploadDir: os.tmpdir(),
      keepExtensions: true,
      maxFileSize: 4 * 1024 * 1024,
      maxFiles: 1,
    });

    form.parse(req, (error, fields, files) => {
      if (error) reject(error);
      else resolve({ fields, files });
    });
  });

function isBlobUrl(value: string): boolean {
  try {
    return new URL(value).hostname.endsWith('.blob.vercel-storage.com');
  } catch {
    return false;
  }
}

async function removeAvatar(avatarUrl: string): Promise<void> {
  if (avatarUrl === DEFAULT_AVATAR) return;

  if (isBlobUrl(avatarUrl)) {
    await del(avatarUrl);
    return;
  }

  if (avatarUrl.startsWith('/uploads/')) {
    const localPath = path.join(process.cwd(), 'public', avatarUrl.replace(/^\/+/, ''));
    await fs.unlink(localPath);
  }
}

async function storeAvatar(userId: number, uploadedFile: FormidableFile): Promise<string> {
  const extension = uploadedFile.mimetype === 'image/png' ? '.png' : '.jpg';

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(
      `avatars/${userId}/avatar${extension}`,
      await fs.readFile(uploadedFile.filepath),
      {
        access: 'public',
        addRandomSuffix: true,
        contentType: uploadedFile.mimetype || undefined,
      }
    );
    return blob.url;
  }

  if (process.env.VERCEL) {
    throw new Error('BLOB_READ_WRITE_TOKEN is not configured.');
  }

  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadDir, { recursive: true });
  const fileName = `${Date.now()}_${userId}${extension}`;
  await fs.copyFile(uploadedFile.filepath, path.join(uploadDir, fileName));
  return `/uploads/${fileName}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const user = await authenticateUser(req);
  if (!user) return res.status(401).json({ message: 'Unauthorized' });

  let uploadedFile: FormidableFile | undefined;
  let storedAvatarUrl = '';
  let databaseUpdated = false;

  try {
    const { files } = await parseForm(req);
    uploadedFile = Array.isArray(files.file) ? files.file[0] : files.file;

    if (!uploadedFile) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    if (!uploadedFile.mimetype || !ALLOWED_MIME_TYPES.has(uploadedFile.mimetype)) {
      return res.status(400).json({ message: 'Invalid file type. Only JPEG and PNG are allowed.' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { avatar: true },
    });

    storedAvatarUrl = await storeAvatar(user.id, uploadedFile);

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { avatar: storedAvatarUrl },
    });
    databaseUpdated = true;

    if (existingUser?.avatar) {
      await removeAvatar(existingUser.avatar).catch((error) => {
        console.warn('Unable to remove the previous avatar:', error);
      });
    }

    return res.status(200).json({
      message: 'Avatar updated successfully',
      url: storedAvatarUrl,
      user: {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      },
    });
  } catch (error) {
    if (storedAvatarUrl && !databaseUpdated) {
      await removeAvatar(storedAvatarUrl).catch(() => undefined);
    }

    console.error('Error handling avatar update:', error);
    return res.status(500).json({
      message: 'Avatar update failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  } finally {
    if (uploadedFile?.filepath) {
      await fs.unlink(uploadedFile.filepath).catch(() => undefined);
    }
  }
}
