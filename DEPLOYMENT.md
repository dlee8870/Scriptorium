# Production deployment

The free production system uses Vercel, PostgreSQL, Blob storage, and the public Judge0 CE API. A self-hosted runner is optional.

## Optional: deploy your own runner

Skip this section when using Judge0. To replace the free public API later, provision a Linux VM with a public hostname. Install Node.js 20+, Docker Engine, Git, and Caddy. Keep TCP port `4000` private; only ports `80` and `443` should be public.

Clone the repository into `/opt/scriptorium`, then build the language images:

```bash
cd /opt/scriptorium
sudo useradd --system --create-home --shell /usr/sbin/nologin scriptorium || true
sudo usermod -aG docker scriptorium
sudo bash runner/build-images.sh
sudo chown -R scriptorium:scriptorium /opt/scriptorium
```

Generate a runner secret:

```bash
openssl rand -hex 32
```

Create `/etc/scriptorium-runner.env` owned by root with mode `600`:

```dotenv
RUNNER_API_KEY=the-generated-secret
RUNNER_HOST=127.0.0.1
RUNNER_PORT=4000
RUNNER_MAX_CONCURRENCY=4
```

Install and start the service:

```bash
sudo cp runner/scriptorium-runner.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now scriptorium-runner
sudo systemctl status scriptorium-runner
```

Copy `runner/Caddyfile.example` to `/etc/caddy/Caddyfile`, replace `runner.example.com`, and reload Caddy. Verify:

```bash
curl https://runner.example.com/health
curl -X POST https://runner.example.com/execute \
  -H "Authorization: Bearer the-generated-secret" \
  -H "Content-Type: application/json" \
  -d '{"language":"python","code":"print(\"runner ok\")","stdin":""}'
```

## 2. Create managed storage

In the Vercel project dashboard:

1. Install a PostgreSQL integration such as Neon and connect it to the project.
2. Confirm that the integration created `DATABASE_URL` for Production and Preview.
3. Create a public Vercel Blob store and connect it to the project.
4. Confirm that Vercel created `BLOB_READ_WRITE_TOKEN`.

Use a database region close to the Vercel Functions region.

## 3. Configure Vercel

Import `dlee8870/Scriptorium` as a Next.js project. The repository root is the application root.

Add these environment variables to Production and Preview:

```dotenv
JWT_SECRET=another-independent-random-secret
JWT_EXPIRES_IN=1h
BCRYPT_SALT_ROUNDS=10
EXECUTION_API_URL=https://runner.example.com
EXECUTION_API_KEY=the-runner-secret
EXECUTION_PROVIDER=judge0
JUDGE0_API_URL=https://ce.judge0.com
```

For the free deployment, set `EXECUTION_PROVIDER=judge0` and omit both runner variables. Do not reuse `JWT_SECRET` as a runner secret if you self-host later. The `vercel-build` script generates Prisma Client, applies committed migrations, and builds Next.js.

## 4. Import existing data

The first deployment creates the schema. To move the original data, set your local `DATABASE_URL` temporarily to the production connection string and run:

```bash
npm run db:deploy
npm run db:import-sqlite
```

The importer refuses to modify a non-empty destination. To migrate existing avatar files afterward, also set `BLOB_READ_WRITE_TOKEN` locally and run:

```bash
npm run avatars:migrate
```

Create or promote an administrator without default credentials:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='a-long-unique-password' npm run admin:create
```

## 5. Verify production

Check these workflows after deployment:

1. `GET /api/health` reports a connected database.
2. Signup, login, logout, and authenticated page reloads work.
3. Avatar upload survives a new deployment.
4. Templates can be created, searched, opened, forked, and deleted.
5. Blog posts, comments, votes, reports, and moderation work.
6. Every supported language executes through Judge0.
7. If using the optional runner, requests without the API key return `401`.

Never expose the Docker socket, runner key, database URL, Blob token, or JWT secret in the browser or repository.
