import { BinaryType, buildEngines } from '@lamdb/engine-layer';
import { rm } from 'fs/promises';
import { join } from 'path';
import { exists } from '../src';
import { binaryPath, prismaPath } from './binaryPaths';

beforeAll(async () => {
  await buildEngines({
    destination: binaryPath,
    buildDirectory: binaryPath,
    defaultPlatform: 'detect',
    engines: [BinaryType.libqueryEngine, BinaryType.migrationEngine],
  });
}, 10000);

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
