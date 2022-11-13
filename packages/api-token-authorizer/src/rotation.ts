import { Context, SecretsManagerRotationEvent } from 'aws-lambda';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { LambdaInterface } from '@aws-lambda-powertools/commons';
import { tracer } from '@lamdb/commons';

const secretsManager = tracer.captureAWSv3Client(new SecretsManager({}));

class RotationHandler implements LambdaInterface {
  @tracer.captureLambdaHandler({ captureResponse: false })
  public async handler(event: SecretsManagerRotationEvent, _: Context): Promise<void> {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('secretId', event.SecretId);
    await this.updateToken(event.SecretId, this.generateToken());
  }

  @tracer.captureMethod({ captureResponse: false })
  private generateToken() {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < 80; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  @tracer.captureMethod({ captureResponse: false })
  private async updateToken(secretId: string, token: string): Promise<void> {
    tracer.getSegment().addMetadata('secretId', secretId);
    await secretsManager.updateSecret({
      SecretId: secretId,
      SecretString: token,
    });
  }
}

const handlerClass = new RotationHandler();
export const apiTokenRotation = handlerClass.handler.bind(handlerClass);
