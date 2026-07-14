import runtimeConfig from '@/runner/runtime-config.json';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import { NextApiRequest, NextApiResponse } from 'next';
import os from 'os';
import path from 'path';

export const config = {
  maxDuration: 60,
};

interface RuntimeProfile {
  image: string;
  fileName: string;
  timeoutMs: number;
  memory: string;
  cpus: string;
  judge0LanguageId: number;
}

const runtimes = runtimeConfig as Record<string, RuntimeProfile>;
const MAX_CODE_BYTES = 100 * 1024;
const MAX_STDIN_BYTES = 64 * 1024;
const MAX_OUTPUT_BYTES = 1024 * 1024;

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { language, code, stdin = '' }: { language?: string; code?: string; stdin?: string } = req.body;
  const runtime = language ? runtimes[language] : undefined;

  if (!language || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Language and code are required.' });
  }
  if (!runtime) return res.status(400).json({ error: 'Unsupported language.' });
  if (typeof stdin !== 'string') return res.status(400).json({ error: 'Standard input must be text.' });
  if (Buffer.byteLength(code) > MAX_CODE_BYTES) {
    return res.status(413).json({ error: 'Code exceeds the 100 KB limit.' });
  }
  if (Buffer.byteLength(stdin) > MAX_STDIN_BYTES) {
    return res.status(413).json({ error: 'Standard input exceeds the 64 KB limit.' });
  }

  try {
    const provider = process.env.EXECUTION_PROVIDER?.trim().toLowerCase();
    const output = provider === 'judge0'
      ? await runWithJudge0(code, stdin, runtime)
      : process.env.EXECUTION_API_URL
        ? await runRemotely(language, code, stdin, runtime.timeoutMs)
        : await runLocally(code, stdin, runtime);
    return res.status(200).json({ output: output || 'No output' });
  } catch (error: unknown) {
    const executionError = error as { status?: number; message?: string };
    return res.status(executionError.status || 500).json({
      error: executionError.message || 'Execution failed',
    });
  }
}

interface Judge0Response {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  status?: { id: number; description: string };
}

async function runWithJudge0(code: string, stdin: string, runtime: RuntimeProfile): Promise<string> {
  const baseUrl = new URL(process.env.JUDGE0_API_URL || 'https://ce.judge0.com');
  if (baseUrl.protocol !== 'https:') {
    throw { status: 503, message: 'Judge0 must use HTTPS.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(runtime.timeoutMs, 15000) + 5000);

  try {
    const response = await fetch(new URL('/submissions?base64_encoded=false&wait=true', baseUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: runtime.judge0LanguageId,
        source_code: code,
        stdin,
      }),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as Judge0Response | null;

    if (!response.ok || !data) {
      throw { status: response.status || 502, message: data?.message || 'Judge0 rejected the request.' };
    }

    const output = [data.compile_output, data.stdout, data.stderr, data.message]
      .filter((value): value is string => Boolean(value))
      .join('\n')
      .trim();

    if (Buffer.byteLength(output) > MAX_OUTPUT_BYTES) {
      throw { status: 413, message: 'Program output exceeded the 1 MB limit.' };
    }
    if (data.status?.id === 3) return output;
    if (data.status?.id === 5) throw { status: 408, message: output || 'Execution timed out.' };
    if (!data.status || data.status.id <= 2 || data.status.id >= 13) {
      throw { status: 502, message: output || 'Judge0 could not complete the execution.' };
    }
    throw { status: 422, message: output || data.status.description };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw { status: 408, message: 'Execution timed out.' };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runRemotely(
  language: string,
  code: string,
  stdin: string,
  timeoutMs: number
): Promise<string> {
  const apiKey = process.env.EXECUTION_API_KEY;
  if (!apiKey) throw { status: 503, message: 'The execution service is not configured.' };

  const baseUrl = new URL(process.env.EXECUTION_API_URL as string);
  if (process.env.NODE_ENV === 'production' && baseUrl.protocol !== 'https:') {
    throw { status: 503, message: 'The execution service must use HTTPS.' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs + 5000);

  try {
    const response = await fetch(new URL('/execute', baseUrl), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ language, code, stdin }),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as { output?: string; error?: string } | null;

    if (!response.ok) {
      throw { status: response.status, message: data?.error || 'The execution service rejected the request.' };
    }

    return data?.output || '';
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw { status: 408, message: 'Execution timed out.' };
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function runLocally(code: string, stdin: string, runtime: RuntimeProfile): Promise<string> {
  if (process.env.VERCEL) {
    throw { status: 503, message: 'The execution service is not configured.' };
  }

  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptorium-'));
  const filePath = path.join(tempDir, runtime.fileName);

  try {
    await fs.writeFile(filePath, code, 'utf8');
    return await runInDocker(runtime, filePath, stdin);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
  }
}

function runInDocker(runtime: RuntimeProfile, filePath: string, stdin: string): Promise<string> {
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

    const appendOutput = (current: string, chunk: Buffer) => {
      const next = current + chunk.toString();
      if (Buffer.byteLength(next) > MAX_OUTPUT_BYTES) {
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
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      reject({
        status: error.code === 'ENOENT' ? 503 : 500,
        message: error.code === 'ENOENT' ? 'Docker is not available on this machine.' : error.message,
      });
    });
    child.on('close', (code) => {
      clearTimeout(timeout);
      if (timedOut) return reject({ status: 408, message: 'Execution timed out.' });
      if (outputLimitExceeded) {
        return reject({ status: 413, message: 'Program output exceeded the 1 MB limit.' });
      }

      const output = `${stdout}${stderr ? `${stdout ? '\n' : ''}${stderr}` : ''}`.trim();
      if (code && code !== 0) {
        const dockerUnavailable = /failed to connect to the docker api|cannot connect to the docker daemon/i.test(output);
        const imageMissing = /unable to find image|pull access denied|no such image/i.test(output);
        return reject({
          status: dockerUnavailable || imageMissing ? 503 : 422,
          message: dockerUnavailable
            ? 'Docker is installed but is not running.'
            : imageMissing
              ? 'The language runtime image is not installed.'
              : output || `Process exited with status ${code}.`,
        });
      }
      resolve(output);
    });
    child.stdin.end(stdin);
  });
}
