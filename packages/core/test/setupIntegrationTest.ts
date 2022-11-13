import { exists } from '@lamdb/commons';
import { rm } from 'fs/promises';
import { join } from 'path';
import { prismaPath } from './binaryPaths';

beforeEach(async () => {
  const removed: string[] = [];
  await Promise.all(
    ['database.db', 'database.db-journal', 'database.db-shm', 'database.db-wal', 'database.db.migration.lock'].map(
      async (filename) => {
        const filePath = join(prismaPath, filename);
        if (await exists(filePath)) {
          removed.push(filePath);
          await rm(filePath);
        }
      },
    ),
  );
  if (removed.length > 0) {
    console.log('Removed existing database files', removed);
  }
});
