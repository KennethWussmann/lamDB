import { CorsHttpMethod, HttpApi, HttpMethod, IHttpRouteAuthorizer } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { CfnStage } from 'aws-cdk-lib/aws-apigatewayv2';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { LamDBApplication } from './lamDBApplication';

export type LamDBAPIProps = {
  name: string;
  application: LamDBApplication;
  authorizer?: IHttpRouteAuthorizer;
  accessLogging?: boolean;
};

export class LamDBAPI extends HttpApi {
  public readonly accessLogs: LogGroup | undefined;

  constructor(scope: Construct, id: string, props: LamDBAPIProps) {
    super(scope, id, {
      apiName: `${props.name}-api`,
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: props.authorizer,
    });

    const methods = [HttpMethod.POST, HttpMethod.OPTIONS];
    const graphQLIntegration = new HttpLambdaIntegration(
      'GraphQLIntegration',
      props.application.graphQlHandlerAlias ?? props.application.graphQlHandler,
    );
    this.addRoutes({
      integration: graphQLIntegration,
      path: '/graphql',
      methods,
    });
    // redirect dataproxy requests to the same proxy lambda as /graphql. They are compatible and the same.
    this.addRoutes({
      integration: graphQLIntegration,
      path: '/{clientId}/{schemaHash}/graphql',
      methods,
    });

    if (props.accessLogging) {
      this.accessLogs = this.enableAccessLogging(props.name);
    }

    if (this.url) {
      new CfnOutput(this, `${props.name}-url`, {
        exportName: `${props.name}-url`,
        value: this.url,
      });
    }
  }

  private enableAccessLogging = (name: string) => {
    const accessLogs = new LogGroup(this, 'AccessLogs', {
      removalPolicy: RemovalPolicy.DESTROY,
      retention: RetentionDays.ONE_DAY,
      logGroupName: `/aws/api-gateway/${this.apiId}-${name}/access-logs`,
    });
    const stage = this.defaultStage?.node.defaultChild as CfnStage;
    stage.accessLogSettings = {
      destinationArn: accessLogs.logGroupArn,
      format: JSON.stringify({
        requestId: '$context.requestId',
        userAgent: '$context.identity.userAgent',
        sourceIp: '$context.identity.sourceIp',
        requestTime: '$context.requestTime',
        httpMethod: '$context.httpMethod',
        path: '$context.path',
        status: '$context.status',
        responseLength: '$context.responseLength',
      }),
    };

    return accessLogs;
  };
}
