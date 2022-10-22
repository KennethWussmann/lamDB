import { GraphQLClient } from 'graphql-request';
import { getSdk, Sdk } from './sdk';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

let sdk: Sdk | undefined;
const secretsManager = new SecretsManager({});

const getApiToken = async (secretId: string) => {
  const result = await secretsManager.getSecretValue({
    SecretId: secretId,
  });
  if (!result.SecretString) {
    throw new Error('Failed to retrieve API token');
  }
  return result.SecretString;
};

export const getClient = async (
  baseUrl: string = process.env.LAMDB_BASE_URL ?? '',
  apiTokenSecretId: string = process.env.LAMDB_API_TOKEN_SECRET_ID ?? '',
) => {
  if (sdk) {
    return sdk;
  }
  sdk = getSdk(
    new GraphQLClient(`${baseUrl}/graphql`, {
      headers: {
        Authorization: await getApiToken(apiTokenSecretId),
      },
    }),
  );
  return sdk;
};
