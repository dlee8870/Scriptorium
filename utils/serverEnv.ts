export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();

  if (!secret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is required in production.');
  }

  return secret || 'development_secret';
}
