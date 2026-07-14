#!/usr/bin/env bash
set -euo pipefail

if ! docker info >/dev/null 2>&1; then
  echo "Docker is required and must be running before setup."
  exit 1
fi

npm ci
docker compose -f docker-compose.dev.yml up -d --wait
npx prisma migrate deploy

user_count="$(node --input-type=module <<'NODE'
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
console.log(await prisma.user.count());
await prisma.$disconnect();
NODE
)"

if [[ "$user_count" == "0" ]]; then
  if [[ -f prisma/sqlite-export.json ]]; then
    npm run db:import-sqlite
  else
    npm run db:seed
  fi
fi

bash runner/build-images.sh
npm run build

echo "Setup complete. Run ./run.sh to start Scriptorium."
