import {
  APIGatewaySimpleAuthorizerResult,
  APIGatewayRequestSimpleAuthorizerHandlerV2,
  APIGatewayRequestAuthorizerEventV2,
} from 'aws-lambda';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

let apiTokens: string[] = [];
let apiTokensValidUntil = -1;

const secretsManager = new SecretsManager({});

const findSecretNames = async (secretPrefix: string): Promise<string[]> => {
  const result = await secretsManager.listSecrets({
    Filters: [
      {
        Key: 'name',
        Values: [secretPrefix],
      },
    ],
  });

  return result.SecretList?.map((secret) => secret.Name).filter((name): name is string => !!name) ?? [];
};

const getSecretValues = async (secretPrefix: string): Promise<string[]> => {
  const names = await findSecretNames(secretPrefix);

  return await Promise.all(
    names.map(async (name) => {
      const result = await secretsManager.getSecretValue({
        SecretId: name,
      });

      if (!result.SecretString) {
        throw new Error('Failed to retrieve secret value');
      }
      return result.SecretString;
    }),
  );
};

const getApiTokens = async (secretPrefix: string): Promise<string[]> => {
  if (apiTokensValidUntil > new Date().getTime() && apiTokens.length > 0) {
    return apiTokens;
  }

  apiTokens = await getSecretValues(secretPrefix);
  apiTokensValidUntil = new Date().getTime() + 1000 * 60;

  return apiTokens;
};

export const getApiTokenFromRequest = ({
  headers = {},
}: {
  headers?: Record<string, string | undefined>;
}): string | undefined => {
  const authHeader = headers['authorization'];

  if (!authHeader) {
    return authHeader;
  }

  const trimmedValue = authHeader.trim();

  if (trimmedValue.includes(' ')) {
    return trimmedValue.split(' ')[1];
  }
  return trimmedValue;
};

export const apiTokenAuthorizer: APIGatewayRequestSimpleAuthorizerHandlerV2 = async (
  event: APIGatewayRequestAuthorizerEventV2,
): Promise<APIGatewaySimpleAuthorizerResult> => {
  const secretPrefix = process.env.SECRET_PREFIX;
  if (!secretPrefix) {
    throw new Error('Secret prefix environment variable not set: SECRET_PREFIX');
  }

  const usedToken = getApiTokenFromRequest(event);
  if (!usedToken) {
    return { isAuthorized: false };
  }

  const tokens = await getApiTokens(secretPrefix);
  return {
    isAuthorized: tokens.includes(usedToken),
  };
};
