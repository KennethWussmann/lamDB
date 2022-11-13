import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { Context } from 'aws-lambda';
import { DeepMockProxy, mock, mockDeep } from 'jest-mock-extended';
import { RotationHandler } from './rotation';

let rotation: RotationHandler;
let secretsManagerMock: DeepMockProxy<SecretsManager>;

describe('Rotation', () => {
  beforeEach(() => {
    secretsManagerMock = mockDeep<SecretsManager>();
    rotation = new RotationHandler(secretsManagerMock);
  });

  it('should rotate a secret', async () => {
    await rotation.handler(
      {
        SecretId: '/tokens/token-a',
        ClientRequestToken: 'something',
        Step: 'setSecret',
      },
      mock<Context>(),
    );

    expect(secretsManagerMock.updateSecret).toHaveBeenCalledWith({
      SecretId: '/tokens/token-a',
      SecretString: expect.any(String),
    });
    expect(secretsManagerMock.updateSecret.mock.calls[0][0].SecretString).toHaveLength(80);
  });
});
