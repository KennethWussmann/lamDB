import { databasePath, migrationEnginePath, prismaSchemaPath } from '../../test/binaryPaths';
import { MigrationEngine } from './migrationEngine';

const engine = new MigrationEngine({
  binaryPath: migrationEnginePath,
  databaseFilePath: databasePath,
  prismaSchemaPath: prismaSchemaPath,
});

describe('migrationEngine', () => {
  it('applies migrations to database', async () => {
    const appliedMigrations = await engine.apply();

    expect(appliedMigrations).toMatchInlineSnapshot(`
      [
        "20221022090016_configure_wal",
        "20221022090018_create_article_table",
        "20221022104024_import_data",
      ]
    `);
  });
});
