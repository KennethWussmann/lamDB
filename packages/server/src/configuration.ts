import { config } from 'dotenv';

config();
export class Configuration {
  proxyPort = parseInt(assertEnv('PROXY_PORT', '4000'), 10);
  queryEngineLibraryPath = assertEnv('QUERY_ENGINE_LIBRARY_PATH');
  databasePath = assertEnv('DATABASE_PATH');
  prismaSchemaPath = assertEnv('PRISMA_SCHEMA_PATH');
}

const assertEnv = (name: string, defaultValue: string | undefined = undefined): string => {
  const value = process.env[name] ?? defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${name} not set, but required`);
  }
  return value;
};
