import { NextApiRequest, NextApiResponse } from 'next';
import executeHandler from './execute';

export default async function handler(req: NextApiRequest, res: NextApiResponse): Promise<void> {
  if (req.method === 'POST' && req.body && typeof req.body === 'object') {
    req.body = {
      language: req.body.language,
      code: req.body.code,
      stdin: req.body.stdin ?? req.body.input ?? '',
    };
  }

  return executeHandler(req, res);
}
