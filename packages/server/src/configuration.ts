import { config } from 'dotenv';

config();
export class Configuration {
  proxyPort = parseInt(assertEnv('PROXY_PORT', '4000'), 10);
  queryEnginePort = parseInt(assertEnv('QUERY_ENGINE_PORT', '8080'), 10);
  queryEngineEnablePlayground = assertEnv('QUERY_ENGINE_ENABLE_PLAYGROUND', 'false') === 'true';
  queryEngineDebug = assertEnv('QUERY_ENGINE_DEBUG', 'false') === 'true';
  queryEngineBinaryPath = assertEnv('QUERY_ENGINE_BINARY_PATH');
  litestreamBinaryPath = assertEnv('LITESTREAM_BINARY_PATH');
  litestreamBucketName = assertEnv('LITESTREAM_BUCKET_NAME');
  litestreamObjectKey = assertEnv('LITESTREAM_OBJECT_KEY', 'database');
  litestreamAccessKeyId = process.env.LITESTREAM_ACCESS_KEY_ID;
  litestreamSecretAccessKey = process.env.LITESTREAM_SECRET_ACCESS_KEY;
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
