import { exists } from '../fileUtils';
import { createLogger } from '../logger';
import { defaultFileAdapter, FileAdapter } from './fileAdapter/fileAdapter';

const defaultFilePath = '/tmp/database.db';

export class FileManager {
  private downloadedAt: Date | undefined;
  private logger = createLogger({ name: 'FileManager' });

  constructor(
    private fileAdapter: FileAdapter = defaultFileAdapter,
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
    await this.fileAdapter.download(this.fileAdapter.filePath ?? defaultFilePath);
    this.downloadedAt = new Date();
  };

  upload = async () => {
    if (!(await exists(this.fileAdapter.filePath ?? defaultFilePath))) {
      return;
    }
    await this.fileAdapter.upload(this.fileAdapter.filePath ?? defaultFilePath);
  };
}

const defaultFileManager = new FileManager();

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
