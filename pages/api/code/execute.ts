import { spawn } from 'child_process';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { NextApiRequest, NextApiResponse } from 'next';

const dockerImages: Record<string, string> = {
  python: 'sandbox-python:3.10',
  java: 'sandbox-java:17',
  kotlin: 'sandbox-kotlin:2.0',
  javascript: 'sandbox-node:18',
  c: 'sandbox-c:latest',
  cpp: 'sandbox-cpp:latest',
  go: 'sandbox-go:1.20',
  ruby: 'sandbox-ruby:3.2',
  php: 'sandbox-php:8.2',
  rust: 'sandbox-rust:1.73',
  dart: 'sandbox-dart:stable',
};

const fileNames: Record<string, string> = {
  python: 'sandbox.py',
  java: 'Main.java',
  kotlin: 'Main.kt',
  javascript: 'sandbox.js',
  c: 'sandbox.c',
  cpp: 'sandbox.cpp',
  go: 'sandbox.go',
  ruby: 'sandbox.rb',
  php: 'sandbox.php',
  rust: 'sandbox.rs',
  dart: 'sandbox.dart',
};

const MAX_OUTPUT_BYTES = 1024 * 1024;

const runtimeProfiles: Record<string, { timeoutMs: number; memory: string; cpus: string }> = {
  java: { timeoutMs: 15000, memory: '256m', cpus: '1' },
  kotlin: { timeoutMs: 30000, memory: '512m', cpus: '1' },
  c: { timeoutMs: 15000, memory: '256m', cpus: '1' },
  cpp: { timeoutMs: 15000, memory: '256m', cpus: '1' },
  go: { timeoutMs: 30000, memory: '256m', cpus: '1' },
  rust: { timeoutMs: 15000, memory: '256m', cpus: '1' },
};

const defaultRuntimeProfile = { timeoutMs: 5000, memory: '128m', cpus: '0.5' };

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { language, code, stdin = '' }: { language?: string; code?: string; stdin?: string } = req.body;

  if (!language || typeof code !== 'string' || !code.trim()) {
    return res.status(400).json({ error: 'Language and code are required.' });
  }

  const image = dockerImages[language];
  const fileName = fileNames[language];
  if (!image || !fileName) {
    return res.status(400).json({ error: 'Unsupported language.' });
  }

  if (typeof stdin !== 'string') {
    return res.status(400).json({ error: 'Standard input must be text.' });
  }

  let tempDir = '';

  try {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'scriptorium-'));
    const filePath = path.join(tempDir, fileName);
    await fs.writeFile(filePath, code, 'utf8');

    const runtimeProfile = runtimeProfiles[language] || defaultRuntimeProfile;
    const result = await runInDocker(
      image,
      filePath,
      fileName,
      stdin,
      runtimeProfile
    );
    return res.status(200).json({ output: result || 'No output' });
  } catch (error: any) {
    const status = error.status || 500;
    return res.status(status).json({ error: error.message || 'Execution failed' });
  } finally {
    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function runInDocker(
  image: string,
  filePath: string,
  fileName: string,
  stdin: string,
  runtimeProfile: { timeoutMs: number; memory: string; cpus: string }
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'run',
      '--rm',
      '-i',
      '--network',
      'none',
      '--memory',
      runtimeProfile.memory,
      '--cpus',
      runtimeProfile.cpus,
      '--pids-limit',
      '128',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,exec,nosuid,size=64m',
      '--security-opt',
      'no-new-privileges',
      '-v',
      `${filePath}:/usr/src/app/${fileName}:ro`,
      image,
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
    }, runtimeProfile.timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout = appendOutput(stdout, chunk);
    });

    child.stderr.on('data', (chunk) => {
      stderr = appendOutput(stderr, chunk);
    });

    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timeout);
      if (error.code === 'ENOENT') {
        reject({ status: 503, message: 'Docker is not available on this machine.' });
      } else {
        reject({ status: 500, message: error.message });
      }
    });

    child.on('close', (code) => {
      clearTimeout(timeout);

      if (timedOut) {
        reject({ status: 408, message: 'Execution timed out.' });
        return;
      }

      if (outputLimitExceeded) {
        reject({ status: 413, message: 'Program output exceeded the 1 MB limit.' });
        return;
      }

      const output = `${stdout}${stderr ? `${stdout ? '\n' : ''}${stderr}` : ''}`.trim();
      if (code && code !== 0) {
        const dockerUnavailable = /failed to connect to the docker api|cannot connect to the docker daemon/i.test(output);
        const imageMissing = /unable to find image|pull access denied|no such image/i.test(output);
        reject({
          status: dockerUnavailable || imageMissing ? 503 : 422,
          message: dockerUnavailable
            ? 'Docker is installed but is not running.'
            : imageMissing
              ? 'The language runtime image is not installed. Run startup.sh first.'
              : output || `Process exited with status ${code}.`,
        });
        return;
      }

      resolve(output);
    });

    child.stdin.end(stdin);
  });
}
