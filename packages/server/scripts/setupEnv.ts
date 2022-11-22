import { join, resolve } from 'path';
import { createLogger, exists } from '@lamdb/commons';
import { writeFile } from 'fs/promises';

const logger = createLogger({ name: 'setupEnv' });
const envFilePath = join(__dirname, '..', '.env');

void (async () => {
  if (await exists(envFilePath)) {
    logger.info('Using already existing .env file', { envFilePath });
    return;
  }
  await writeFile(
    envFilePath,
    [
      `# This file was generated using npm run codegen`,
      `DATABASE_PATH=${resolve(join(__dirname, '..', '..', 'example', 'prisma', 'database.db'))}`,
      `PRISMA_SCHEMA_PATH=${resolve(join(__dirname, '..', '..', 'example', 'prisma', 'schema.prisma'))}`,
      `MIGRATION_ENGINE_BINARY_PATH=${resolve(
        join(__dirname, '..', '..', 'engine-layer', 'dist', 'migration-engine'),
      )}`,
      `QUERY_ENGINE_LIBRARY_PATH=${resolve(
        join(__dirname, '..', '..', 'engine-layer', 'dist', 'libquery-engine.node'),
      )}`,
    ].join('\n'),
    'utf-8',
  );
  logger.info('Created .env file', { envFilePath });
})();
