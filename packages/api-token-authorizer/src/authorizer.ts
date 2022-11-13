import { APIGatewaySimpleAuthorizerResult, APIGatewayRequestAuthorizerEventV2, Context } from 'aws-lambda';
import { SecretsManager } from '@aws-sdk/client-secrets-manager';
import { LambdaInterface } from '@aws-lambda-powertools/commons';
import { tracer } from '@lamdb/commons';

class APITokenAuthorizer implements LambdaInterface {
  secretsManager = tracer.captureAWSv3Client(new SecretsManager({}));
  apiTokens: string[] = [];
  apiTokensValidUntil = -1;

  @tracer.captureLambdaHandler()
  public async handler(
    event: APIGatewayRequestAuthorizerEventV2,
    _: Context,
  ): Promise<APIGatewaySimpleAuthorizerResult> {
    tracer.annotateColdStart();
    const secretPrefix = process.env.SECRET_PREFIX;
    if (!secretPrefix) {
      throw new Error('Secret prefix environment variable not set: SECRET_PREFIX');
    }
    tracer.getSegment().addMetadata('secretPrefix', secretPrefix);

    const usedToken = this.getApiTokenFromRequest(event);
    if (!usedToken) {
      return { isAuthorized: false };
    }

    const tokens = await this.getApiTokens(secretPrefix);
    return {
      isAuthorized: tokens.includes(usedToken),
    };
  }

  @tracer.captureMethod({ captureResponse: false })
  private getApiTokenFromRequest({
    headers = {},
  }: {
    headers?: Record<string, string | undefined>;
  }): string | undefined {
    const authHeader = headers['authorization'];
    if (!authHeader) {
      return authHeader;
    }
    const trimmedValue = authHeader.trim();
    if (trimmedValue.includes(' ')) {
      return trimmedValue.split(' ')[1];
    }
    return trimmedValue;
  }

  @tracer.captureMethod({ captureResponse: false })
  private async getApiTokens(secretPrefix: string): Promise<string[]> {
    tracer.getSegment().addMetadata('secretPrefix', secretPrefix);
    const tokenCacheValid = this.apiTokensValidUntil > new Date().getTime() && this.apiTokens.length > 0;
    tracer.getSegment().addMetadata('tokenCacheValid', tokenCacheValid);
    if (tokenCacheValid) {
      return this.apiTokens;
    }

    this.apiTokens = await this.getSecretValues(secretPrefix);
    this.apiTokensValidUntil = new Date().getTime() + 1000 * 30;

    return this.apiTokens;
  }

  @tracer.captureMethod()
  private async findSecretNames(secretPrefix: string): Promise<string[]> {
    tracer.getSegment().addMetadata('secretPrefix', secretPrefix);
    const result = await this.secretsManager.listSecrets({
      Filters: [
        {
          Key: 'name',
          Values: [secretPrefix],
        },
      ],
    });

    return result.SecretList?.map((secret) => secret.Name).filter((name): name is string => !!name) ?? [];
  }

  @tracer.captureMethod({ captureResponse: false })
  async getSecretValues(secretPrefix: string): Promise<string[]> {
    tracer.getSegment().addMetadata('secretPrefix', secretPrefix);
    const names = await this.findSecretNames(secretPrefix);

    return await Promise.all(
      names.map(async (name) => {
        const result = await this.secretsManager.getSecretValue({
          SecretId: name,
        });

        if (!result.SecretString) {
          throw new Error('Failed to retrieve secret value');
        }
        return result.SecretString;
      }),
    );
  }
}

const handlerClass = new APITokenAuthorizer();
export const apiTokenAuthorizer = handlerClass.handler.bind(handlerClass);
