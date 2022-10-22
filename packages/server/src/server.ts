import { MigrationEngine, QueryEngine } from '@lamdb/core';
import { Configuration } from './configuration';
import { startProxy } from './httpProxy';

const start = async (configuration: Configuration = new Configuration()) => {
  const migrationEngine = new MigrationEngine({
    binaryPath: configuration.migrationEngineBinaryPath,
    prismaSchemaPath: configuration.prismaSchemaPath,
    databaseFilePath: configuration.databasePath,
  });

  await migrationEngine.apply(configuration.migrationEngineForceMigration);

  const queryEngine = new QueryEngine({
    libraryPath: configuration.queryEngineLibraryPath,
    prismaSchemaPath: configuration.prismaSchemaPath,
    databaseFilePath: configuration.databasePath,
  });

  startProxy(configuration, queryEngine);
};

start().catch(console.error);
