import { s3FileAdapter } from './s3FileAdapter';

export type FileAdapter = {
  download: (destination: string) => Promise<void>;
  upload: (origin: string) => Promise<void>;
};

export const defaultFileAdapter: FileAdapter = s3FileAdapter();
