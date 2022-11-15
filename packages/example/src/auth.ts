import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({});
let apiToken: string | undefined;

const getApiToken = async (secretId: string = process.env.LAMDB_API_TOKEN_SECRET_ID ?? '') => {
  if (apiToken) {
    return apiToken;
  }
  const result = await secretsManager.getSecretValue({
    SecretId: secretId,
  });
  if (!result.SecretString) {
    throw new Error('Failed to retrieve API token');
  }
  apiToken = result.SecretString;
  return apiToken;
};

/**
 * Set the database connection url to an environment variable referenced in prisma.schema.
 */
export const getDatabaseUrl = async () => {
  // This is necessary, because the API Token can rotate and we don't want to reference secrets in the source code nor rotate it manually ever so often
  // Therefore we ask the SecretsManager about the secret value and build the connection string during runtime.
  // The connection string is usual Prisma stuff, just that we use or own data-proxy.
  // See https://www.prisma.io/docs/data-platform/data-proxy
  return `${process.env.LAMDB_BASE_URL?.replace('https', 'prisma')}?api_key=${await getApiToken()}&pool_timeout=3&connection_limit=1`;
};
