import { MigrationEngine } from '../src';
import { databasePath, migrationEnginePath, prismaSchemaPath } from './binaryPaths';

/**
 * Initialize a test database with all migrations applied.
 */
export const initDatabase = async () => {
  const engine = new MigrationEngine({
    binaryPath: migrationEnginePath,
    databaseFilePath: databasePath,
    prismaSchemaPath: prismaSchemaPath,
  });
  await engine.apply();
};
