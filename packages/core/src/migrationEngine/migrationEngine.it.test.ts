import { databasePath, migrationEnginePath, prismaSchemaPath } from '../../test/binaryPaths';
import { MigrationEngine } from './migrationEngine';

const engine = new MigrationEngine({
  binaryPath: migrationEnginePath,
  databaseFilePath: databasePath,
  prismaSchemaPath: prismaSchemaPath,
});

describe('migrationEngine', () => {
  it('applies migrations to fresh database', async () => {
    const appliedMigrations = await engine.apply();

    expect(appliedMigrations).toMatchSnapshot();
  });
});
