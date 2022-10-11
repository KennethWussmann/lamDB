import { exists } from '../fileUtils';
import { createLogger } from '../logger';
import { FileAdapter } from './fileAdapter/fileAdapter';

export class FileManager {
  private downloadedAt: Date | undefined;
  private logger = createLogger({ name: 'FileManager' });

  constructor(
    private databaseFilePath: string,
    private fileAdapter: FileAdapter,
    private cacheSeconds: number = parseInt(process.env.CACHE_SECONDS ?? '30', 10),
  ) {}

  download = async () => {
    if (this.downloadedAt) {
      const cacheAgeMillis = new Date().getTime() - this.downloadedAt.getTime();
      if (cacheAgeMillis < this.cacheSeconds * 1000) {
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
    await this.fileAdapter.download(this.databaseFilePath);
    this.downloadedAt = new Date();
  };

  upload = async () => {
    if (!(await exists(this.databaseFilePath))) {
      return;
    }
    await this.fileAdapter.upload(this.databaseFilePath);
  };
}

export const useDatabase = async <T>(fileManager: FileManager, fn: () => T, uploadAfterWrite = true): Promise<T> => {
  await fileManager.download();

  const result = await fn();

  if (uploadAfterWrite) {
    await fileManager.upload();
  }

  return result;
};

let fileManager: FileManager | undefined;

export const getFileManager = (databaseFilePath: string, fileAdapter: FileAdapter): FileManager => {
  if (fileManager) {
    return fileManager;
  }
  fileManager = new FileManager(databaseFilePath, fileAdapter);
  return fileManager;
};
