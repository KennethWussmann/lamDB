import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { APITokenAuthorizer } from './authorizer';
import { DeepMockProxy, mock, mockDeep } from 'jest-mock-extended';
import { APIGatewayRequestAuthorizerEventV2, Context } from 'aws-lambda';

let authorizer: APITokenAuthorizer;
let secretsManagerMock: DeepMockProxy<SecretsManager>;

const executeHandler = async (token: string) =>
  await authorizer.handler(
    {
      headers: {
        authorization: `Bearer ${token}`,
      },
    } as unknown as APIGatewayRequestAuthorizerEventV2,
    mock<Context>(),
  );

describe('Authorizer', () => {
  beforeEach(() => {
    secretsManagerMock = mockDeep<SecretsManager>();
    secretsManagerMock.listSecrets.mockResolvedValue({
      SecretList: [
        {
          Name: '/tokens/a',
        },
        {
          Name: '/tokens/b',
        },
      ],
    } as never);
    secretsManagerMock.getSecretValue.mockResolvedValueOnce({
      SecretString: 'token-a',
    } as never);
    secretsManagerMock.getSecretValue.mockResolvedValueOnce({
      SecretString: 'token-b',
    } as never);

    authorizer = new APITokenAuthorizer(secretsManagerMock, '/tokens/');
  });

  it('fetches all secrets and returns true for valid token', async () => {
    const { isAuthorized } = await executeHandler('token-a');

    expect(secretsManagerMock.listSecrets).toHaveBeenCalledWith({
      Filters: [
        {
          Key: 'name',
          Values: ['/tokens/'],
        },
      ],
    });
    expect(secretsManagerMock.getSecretValue).toHaveBeenCalledWith({ SecretId: '/tokens/a' });
    expect(secretsManagerMock.getSecretValue).toHaveBeenCalledWith({ SecretId: '/tokens/b' });
    expect(isAuthorized).toBe(true);
  });

  it('does not refetch tokens after short duration', async () => {
    await executeHandler('token-a');
    await executeHandler('token-b');

    expect(secretsManagerMock.listSecrets).toHaveBeenCalledTimes(1);
    expect(secretsManagerMock.getSecretValue).toHaveBeenCalledTimes(2);
  });

  it('rejects invalid token', async () => {
    const { isAuthorized } = await executeHandler('token-invalid');

    expect(isAuthorized).toBe(false);
  });
});
