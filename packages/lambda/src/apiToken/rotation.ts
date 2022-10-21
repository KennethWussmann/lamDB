import { SecretsManagerRotationEvent, SecretsManagerRotationHandler } from 'aws-lambda';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';

const secretsManager = new SecretsManager({});

const generateToken = () => {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  for (let i = 0; i < 80; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};

const updateToken = async (secretId: string, token: string): Promise<void> => {
  await secretsManager.updateSecret({
    SecretId: secretId,
    SecretString: token,
  });
};

export const apiTokenRotation: SecretsManagerRotationHandler = async (
  event: SecretsManagerRotationEvent,
): Promise<void> => {
  await updateToken(event.SecretId, generateToken());
};
