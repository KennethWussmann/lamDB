// istanbul ignore file
import { config } from 'dotenv';

config();
export class LamDBConfiguration {
  get migrationEngineBinaryPath() {
    return assertEnv('MIGRATION_ENGINE_BINARY_PATH');
  }
  get migrationEngineForceMigration() {
    return assertEnv('MIGRATION_ENGINE_FORCE_MIGRATION', 'false').toLowerCase() === 'true';
  }
  get queryEngineLibraryPath() {
    return assertEnv('QUERY_ENGINE_LIBRARY_PATH');
  }
  get databasePath() {
    return assertEnv('DATABASE_PATH');
  }
  get prismaSchemaPath() {
    return assertEnv('PRISMA_SCHEMA_PATH');
  }
  get operationOptimization() {
    return assertEnv('OPERATION_OPTIMIZATION', 'false').toLowerCase() === 'true';
  }

  get server() {
    return new LamDBServerConfiguration();
  }
}

export class LamDBServerConfiguration {
  get allowCors() {
    return assertEnv('ALLOW_CORS', 'false').toLowerCase() === 'true';
  }
  get proxyPort() {
    return parseInt(assertEnv('PROXY_PORT', '4000'), 10);
  }
}

const assertEnv = (name: string, defaultValue: string | undefined = undefined): string => {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} not set, but required`);
  }
  return value;
};
