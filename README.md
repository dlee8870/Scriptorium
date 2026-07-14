# Scriptorium

Scriptorium is a Next.js application for writing, executing, saving, and discussing code templates. Production uses a stateless web deployment, managed PostgreSQL, object storage, and an isolated Docker runner.

## Architecture

- Next.js Pages Router on Vercel
- Prisma with PostgreSQL through a Vercel Marketplace provider such as Neon
- Vercel Blob for user avatars
- A separate authenticated runner service for Docker code execution
- Local Docker execution when `EXECUTION_API_URL` is not set

## Local development

Requirements: Node.js 20 or newer and Docker Desktop.

```bash
cp .env.example .env
npm ci
npm run db:dev:up
npm run db:deploy
npm run db:seed
bash runner/build-images.sh
npm run dev
```

The app runs at `http://localhost:3000`. PostgreSQL runs locally on port `5433`.

To restore the existing SQLite data instead of seeding an empty database:

```bash
npm run db:export-sqlite
npm run db:import-sqlite
```

The export contains password hashes and user data and is excluded from Git.

## Environment

Copy `.env.example` for the complete list. Production requires:

- `DATABASE_URL`
- `JWT_SECRET`
- `BLOB_READ_WRITE_TOKEN`
- `EXECUTION_API_URL`
- `EXECUTION_API_KEY`

The runner requires `RUNNER_API_KEY` with the same value as `EXECUTION_API_KEY`.

## Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run db:deploy
npm run db:seed
npm run admin:create
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for production setup and verification.
