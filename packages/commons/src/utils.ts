import { createHash } from 'crypto';
import { access } from 'fs/promises';
import { Response } from './requestResponse';

export const sha1Hash = (operation: string): string => {
  const hashsum = createHash('sha1');
  hashsum.update(operation);
  return hashsum.digest('hex').toString();
};

export const exists = async (file: string) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

export const errorLog = (e: unknown): object => {
  const error = e as Error;
  return {
    error: {
      name: error.name,
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    },
  };
};

export const graphQlErrorResponse = (message: string): Response => ({
  status: 400,
  body: JSON.stringify({
    data: null,
    errors: [
      {
        message,
      },
    ],
  }),
  headers: {
    'content-type': 'application/json',
  },
});
