# Scriptorium

Scriptorium is a collaborative code-learning application for writing and running code, saving reusable templates, and discussing examples with other users.

**Live application:** [scriptorium-red.vercel.app](https://scriptorium-red.vercel.app)

## Features

- Write and execute code with optional standard input
- Save, tag, search, open, and fork reusable code templates
- Publish blog posts linked to templates
- Comment and vote on community content
- Report content and review reports through the admin interface
- Create accounts, manage profiles, and upload avatars
- Switch between light and dark editor themes

## Supported languages

Python, JavaScript, Java, Kotlin, C, C++, Go, Ruby, PHP, Rust, and Dart.

## Architecture

| Area | Production | Local development |
| --- | --- | --- |
| Web application | Next.js Pages Router on Vercel | Next.js development server |
| Database | PostgreSQL on Neon | PostgreSQL in Docker |
| Data access | Prisma ORM | Prisma ORM |
| Avatar storage | Vercel Blob | Local filesystem |
| Code execution | Public Judge0 CE API | Judge0 or isolated Docker containers |
| Authentication | JWT stored in HTTP-only cookies | JWT stored in HTTP-only cookies |

The production deployment uses free service tiers. Judge0's public community endpoint does not provide a guaranteed service-level agreement, so execution availability and rate limits are outside this application's control. A self-hosted runner is included as an optional alternative.

## Local development

### Requirements

- Node.js 20 or newer
- Docker Desktop
- Git Bash or WSL only when building the optional local language images on Windows

### Setup

#### Dependencies

```bash
npm ci
```

#### Environment file

macOS, Linux, and Git Bash:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

#### Database

```bash
npm run db:dev:up
npm run db:deploy
npm run db:seed
```

#### Code execution

Hosted execution uses the following `.env` values:

```dotenv
EXECUTION_PROVIDER="judge0"
JUDGE0_API_URL="https://ce.judge0.com"
```

Local Docker execution uses an empty `EXECUTION_PROVIDER` and language images built from Git Bash, WSL, macOS, or Linux:

```bash
bash runner/build-images.sh
```

#### Development server

```bash
npm run dev
```

The application is available at [http://localhost:3000](http://localhost:3000). The local PostgreSQL container listens on port `5433`.

## Environment variables

The complete development configuration is documented in `.env.example`. Production requires:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `JWT_EXPIRES_IN` | Authentication token lifetime, such as `1h` |
| `BCRYPT_SALT_ROUNDS` | Password hashing cost |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access token for avatars |
| `EXECUTION_PROVIDER` | Set to `judge0` for hosted execution |
| `JUDGE0_API_URL` | Judge0 API base URL |

Real database URLs, tokens, passwords, and signing secrets are excluded from version control.

## Useful commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run lint` | Run ESLint |
| `npx tsc --noEmit` | Run the TypeScript type checker |
| `npm run build` | Create a production build |
| `npm run db:dev:up` | Start local PostgreSQL |
| `npm run db:dev:down` | Stop local PostgreSQL |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:deploy` | Apply committed migrations |
| `npm run db:seed` | Seed development data |
| `npm run admin:create` | Create or promote an administrator |

## Deployment

The deployed application uses Vercel, Neon PostgreSQL, Vercel Blob, and Judge0 CE. See [DEPLOYMENT.md](./DEPLOYMENT.md) for environment configuration, data migration, optional self-hosted execution, and production verification.
