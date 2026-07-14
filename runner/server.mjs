import { spawn, spawnSync } from 'node:child_process';
import { timingSafeEqual } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

const runtimeConfig = JSON.parse(
  await fs.readFile(new URL('./runtime-config.json', import.meta.url), 'utf8')
);

const host = process.env.RUNNER_HOST || '127.0.0.1';
const port = Number.parseInt(process.env.RUNNER_PORT || '4000', 10);
const apiKey = process.env.RUNNER_API_KEY || '';
const maxConcurrency = Number.parseInt(process.env.RUNNER_MAX_CONCURRENCY || '4', 10);
const maxBodyBytes = 180 * 1024;
const maxCodeBytes = 100 * 1024;
const maxStdinBytes = 64 * 1024;
const maxOutputBytes = 1024 * 1024;
let activeExecutions = 0;

if (apiKey.length < 32) {
  throw new Error('RUNNER_API_KEY must contain at least 32 characters.');
}
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('RUNNER_PORT must be a valid TCP port.');
}
if (!Number.isInteger(maxConcurrency) || maxConcurrency < 1) {
  throw new Error('RUNNER_MAX_CONCURRENCY must be a positive integer.');
}
if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
  throw new Error('Docker must be installed and running before the runner starts.');
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(JSON.stringify(body));
}

function authorized(request) {
  const authorization = request.headers.authorization || '';
  const providedKey = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  const expected = Buffer.from(apiKey);
  const provided = Buffer.from(providedKey);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function readJson(request) {
  const chunks = [];
  let bytes = 0;
  for await (const chunk of request) {
    bytes += chunk.length;
    if (bytes > maxBodyBytes) throw { status: 413, message: 'Request body is too large.' };
    chunks.push(chunk);
  }

  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw { status: 400, message: 'Request body must be valid JSON.' };
  }
}

function validateRequest(body) {
  const { language, code, stdin = '' } = body || {};
  const runtime = runtimeConfig[language];

  if (typeof language !== 'string' || typeof code !== 'string' || !code.trim()) {
    throw { status: 400, message: 'Language and code are required.' };
  }
  if (!runtime) throw { status: 400, message: 'Unsupported language.' };
  if (typeof stdin !== 'string') throw { status: 400, message: 'Standard input must be text.' };
  if (Buffer.byteLength(code) > maxCodeBytes) throw { status: 413, message: 'Code exceeds the 100 KB limit.' };
  if (Buffer.byteLength(stdin) > maxStdinBytes) {
    throw { status: 413, message: 'Standard input exceeds the 64 KB limit.' };
  }
  return { code, stdin, runtime };
}

async function execute(code, stdin, runtime) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptorium-runner-'));
  const filePath = path.join(tempDir, runtime.fileName);

  try {
    await fs.writeFile(filePath, code, 'utf8');
    return await runContainer(runtime, filePath, stdin);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runContainer(runtime, filePath, stdin) {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'run', '--rm', '-i',
      '--network', 'none',
      '--memory', runtime.memory,
      '--cpus', runtime.cpus,
      '--pids-limit', '128',
      '--read-only',
      '--tmpfs', '/tmp:rw,exec,nosuid,size=64m',
      '--cap-drop', 'ALL',
      '--security-opt', 'no-new-privileges',
      '-v', `${filePath}:/usr/src/app/${runtime.fileName}:ro`,
      runtime.image,
    ]);

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let outputLimitExceeded = false;

    const appendOutput = (current, chunk) => {
      const next = current + chunk.toString();
      if (Buffer.byteLength(next) > maxOutputBytes) {
        outputLimitExceeded = true;
        child.kill('SIGKILL');
        return current;
      }
      return next;
    };

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, runtime.timeoutMs);

    child.stdout.on('data', (chunk) => { stdout = appendOutput(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = appendOutput(stderr, chunk); });
    child.on('error', (error) => {
      clearTimeout(timeout);
      reject({ status: 500, message: error.message });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) return reject({ status: 408, message: 'Execution timed out.' });
      if (outputLimitExceeded) return reject({ status: 413, message: 'Program output exceeded the 1 MB limit.' });

      const output = `${stdout}${stderr ? `${stdout ? '\n' : ''}${stderr}` : ''}`.trim();
      if (code && code !== 0) return reject({ status: 422, message: output || `Process exited with status ${code}.` });
      resolve(output);
    });
    child.stdin.end(stdin);
  });
}

const server = http.createServer(async (request, response) => {
  if (request.method === 'GET' && request.url === '/health') {
    return sendJson(response, 200, { status: 'ok', activeExecutions });
  }
  if (request.method !== 'POST' || request.url !== '/execute') {
    return sendJson(response, 404, { error: 'Not found.' });
  }
  if (!authorized(request)) return sendJson(response, 401, { error: 'Unauthorized.' });
  if (activeExecutions >= maxConcurrency) {
    return sendJson(response, 429, { error: 'The runner is at capacity. Try again shortly.' });
  }

  activeExecutions += 1;
  try {
    const { code, stdin, runtime } = validateRequest(await readJson(request));
    const output = await execute(code, stdin, runtime);
    return sendJson(response, 200, { output: output || 'No output' });
  } catch (error) {
    return sendJson(response, error.status || 500, { error: error.message || 'Execution failed.' });
  } finally {
    activeExecutions -= 1;
  }
});

server.requestTimeout = 45_000;
server.headersTimeout = 10_000;
server.listen(port, host, () => {
  console.log(`Scriptorium runner listening on http://${host}:${port}`);
});
