#!/bin/bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  echo "Docker is required and must be running before setup."
  exit 1
fi

echo "Installing dependencies..."
npm ci

echo "Generating the Prisma client and synchronizing the database..."
npx prisma generate
npx prisma db push --skip-generate

echo "Building sandbox images..."
docker build -t sandbox-python:3.10 -f pages/api/code/Dockerfiles/Python/Dockerfile .
docker build -t sandbox-java:17 -f pages/api/code/Dockerfiles/Java/Dockerfile .
docker build -t sandbox-kotlin:2.0 -f pages/api/code/Dockerfiles/Kotlin/Dockerfile .
docker build -t sandbox-node:18 -f pages/api/code/Dockerfiles/JavaScript/Dockerfile .
docker build -t sandbox-c:latest -f pages/api/code/Dockerfiles/C/Dockerfile .
docker build -t sandbox-cpp:latest -f pages/api/code/Dockerfiles/CPP/Dockerfile .
docker build -t sandbox-go:1.20 -f pages/api/code/Dockerfiles/Go/Dockerfile .
docker build -t sandbox-ruby:3.2 -f pages/api/code/Dockerfiles/Ruby/Dockerfile .
docker build -t sandbox-php:8.2 -f pages/api/code/Dockerfiles/PHP/Dockerfile .
docker build -t sandbox-rust:1.73 -f pages/api/code/Dockerfiles/Rust/Dockerfile .
docker build -t sandbox-dart:stable -f pages/api/code/Dockerfiles/Dart/Dockerfile .

echo "Creating the default admin account if it does not exist..."
node --input-type=module <<'NODE'
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'adminpassword';
const saltRounds = Number.parseInt(process.env.BCRYPT_SALT_ROUNDS || '10', 10);

try {
  const existingAdmin = await prisma.user.findUnique({ where: { email } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(password, saltRounds),
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
      },
    });
  }
} finally {
  await prisma.$disconnect();
}
NODE

echo "Building the application..."
npm run build

echo "Setup complete. Run ./run.sh to start Scriptorium."
