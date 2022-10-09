import { access } from 'fs/promises';
import { createLogger } from '../logger';
import { defaultFileAdapter, FileAdapter } from './fileAdapter';

export const databaseFilePath = '/tmp/database.db';

export class FileManager {
  private downloadedAt: Date | undefined;
  private logger = createLogger({ name: 'FileManager' });

  constructor(
    private filePath: string = databaseFilePath,
    private fileAdapter: FileAdapter = defaultFileAdapter,
    private cacheSeconds: number = 30,
  ) {}

  download = async () => {
    if (this.downloadedAt) {
      const cacheAgeMillis = new Date().getTime() - this.downloadedAt.getTime();
      if (cacheAgeMillis > this.cacheSeconds * 1000) {
        this.logger.debug('Using cached database file', {
          cacheAgeMillis,
          downloadedAt: this.downloadedAt.toISOString(),
        });
        return;
      } else {
        this.logger.debug('Downloading database file because cache expired', {
          cacheAgeMillis,
          downloadedAt: this.downloadedAt.toISOString(),
        });
      }
    } else {
      this.logger.debug('Downloading database file because none cached yet');
    }
    await this.fileAdapter.download(this.filePath);
    this.downloadedAt = new Date();
  };

  upload = async () => {
    if (!(await exists(this.filePath))) {
      return;
    }
    await this.fileAdapter.upload(this.filePath);
  };
}

const defaultFileManager = new FileManager();

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

export const useDatabase = async <T>(
  fn: () => T,
  uploadAfterWrite = true,
  fileManager = defaultFileManager,
): Promise<T> => {
  await fileManager.download();

  const result = await fn();

  if (uploadAfterWrite) {
    await fileManager.upload();
  }

  return result;
};
