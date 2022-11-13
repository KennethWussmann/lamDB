import { IHttpRouteAuthorizer } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaAuthorizer, HttpLambdaResponseType } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { Annotations, CfnOutput, Duration } from 'aws-cdk-lib';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';
import { join } from 'path';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { LambdaFunctionType } from './types';

export type LamDBApiTokenAuthorizerTokenProps = {
  name: string;
  rotateAfter?: Duration;
};

export type LamDBApiTokenAuthorizerProps = {
  name: string;
  tokens: LamDBApiTokenAuthorizerTokenProps[];
  lambdaFunctionProps?: Partial<Record<LambdaFunctionType, Partial<LamDBFunctionProps>>>;
  tracing?: boolean;
} & Pick<LamDBFunctionProps, 'logLevel'>;

export class LamDBApiTokenAuthorizer extends Construct {
  public readonly authorizer: IHttpRouteAuthorizer;
  public readonly secrets: ISecret[];
  public readonly rotationFunction: LamDBFunction;
  public readonly authorizerFunction: LamDBFunction;
  constructor(scope: Construct, id: string, props: LamDBApiTokenAuthorizerProps) {
    super(scope, id);

    if (props.tokens.length === 0) {
      Annotations.of(this).addError('Cannot create api token authorizer: Given token array is empty');
      process.exit(1);
    }
    const tracing = props.tracing ? Tracing.ACTIVE : undefined;
    const secretPrefix = `/${props.name}/api-token/`;

    this.rotationFunction = new LamDBFunction(this, 'ApiTokenRotationFunction', {
      functionName: `${props.name}-api-token-rotation`,
      handler: 'apiTokenRotation',
      memorySize: 128,
      tracing,
      logLevel: props.logLevel,
      entry: join(__dirname, 'lambda', 'rotation.js'),
      ...props.lambdaFunctionProps?.['token-rotation'],
      environment: {
        SECRET_PREFIX: secretPrefix,
        ...props.lambdaFunctionProps?.['token-rotation']?.environment,
      },
    });

    this.authorizerFunction = new LamDBFunction(this, 'ApiTokenAuthorizerFunction', {
      functionName: `${props.name}-api-token-authorizer`,
      handler: 'apiTokenAuthorizer',
      memorySize: 512,
      tracing,
      logLevel: props.logLevel,
      entry: join(__dirname, 'lambda', 'authorizer.js'),
      ...props.lambdaFunctionProps?.authorizer,
      environment: {
        SECRET_PREFIX: secretPrefix,
        ...props.lambdaFunctionProps?.authorizer?.environment,
      },
    });
    this.authorizerFunction.addToRolePolicy(
      new PolicyStatement({
        actions: ['secretsmanager:ListSecrets'],
        resources: ['*'],
      }),
    );

    this.secrets = props.tokens.map((token) => {
      const secret = new Secret(this, token.name, {
        secretName: `${secretPrefix}${token.name}`,
        generateSecretString: {
          excludePunctuation: true,
          passwordLength: 80,
        },
      });

      if (token.rotateAfter) {
        secret.addRotationSchedule(`${token.name}Schedule`, {
          automaticallyAfter: token.rotateAfter,
          rotationLambda: this.rotationFunction,
        });
        secret.grantRead(this.rotationFunction);
        secret.grantWrite(this.rotationFunction);
      }
      secret.grantRead(this.authorizerFunction);
      return secret;
    });

    this.authorizer = new HttpLambdaAuthorizer('ApiTokenAuthorizer', this.authorizerFunction, {
      authorizerName: `${props.name}-api-token`,
      identitySource: ['$request.header.Authorization'],
      responseTypes: [HttpLambdaResponseType.SIMPLE],
    });

    props.tokens.forEach((token) => {
      new CfnOutput(this, `${props.name}-${token.name}-token`, {
        value: `${secretPrefix}${token.name}`,
        exportName: `${props.name}-${token.name}-token`,
      });
    });
  }
}
