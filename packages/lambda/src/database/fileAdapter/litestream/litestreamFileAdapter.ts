import { unlink } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { exists } from '../../../utils';
import { createLogger } from '../../../logger';
import { FileAdapter } from '../fileAdapter';
import { LitestreamService } from './litestreamService';

const logger = createLogger({ name: 'LitestreamFileAdapter' });

const deleteDatabaseFiles = async (destination: string) => {
  const directory = dirname(destination);
  const fileNameWithExtension = basename(destination);

  await Promise.all(
    [
      destination,
      join(directory, `.${fileNameWithExtension}-litestream`),
      join(directory, `${fileNameWithExtension}-shm`),
      join(directory, `${fileNameWithExtension}-wal`),
    ].map(async (file) => {
      if (await exists(file)) {
        logger.debug('Deleting existing database file', { file });
        // litestream wont restore to destination, if file already exists
        try {
          await unlink(file);
        } catch (e: any) {
          logger.error('Failed to delete database file', { error: e?.message, file });
        }
      } else {
        logger.debug('No existing database file', { file });
      }
    }),
  );
};

export const litestreamReplicaFileAdapter: (litestreamService: LitestreamService) => FileAdapter = (
  litestreamService: LitestreamService,
) => ({
  download: async (destination: string) => {
    await deleteDatabaseFiles(destination);
    await litestreamService.restore();
    await litestreamService.replicate();
  },
  upload: async () => {
    // no op, replicator will upload
  },
});

export const litestreamRestoreFileAdapter: (litestreamService: LitestreamService) => FileAdapter = (
  litestreamService: LitestreamService,
) => ({
  download: async (destination: string) => {
    await deleteDatabaseFiles(destination);
    await litestreamService.restore();
  },
  upload: async () => {
    // no op, don't overwrite newer remote files
  },
});
