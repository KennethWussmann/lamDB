import { databaseMigrationLockPath, databasePath, migrationEnginePath, prismaSchemaPath } from '../../test/binaryPaths';
import { exists } from '../utils';
import { MigrationEngine } from './migrationEngine';

const engine = new MigrationEngine({
  binaryPath: migrationEnginePath,
  databaseFilePath: databasePath,
  prismaSchemaPath: prismaSchemaPath,
});

describe('migrationEngine', () => {
  it('applies migrations to fresh database and trying to reapply is skipped', async () => {
    const appliedMigrations = await engine.apply();
    const lockFileExists = await exists(databaseMigrationLockPath);

    expect(lockFileExists).toBeTruthy();
    expect(appliedMigrations).toMatchSnapshot();

    const retryAppliedMigrations = await engine.apply();
    expect(retryAppliedMigrations).toHaveLength(0);
  });
});
