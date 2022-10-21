import { CorsHttpMethod, HttpApi, HttpMethod, IHttpRouteAuthorizer } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { CfnOutput } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LamDBApplication } from './lamDBApplication';

export type LamDBAPIProps = {
  name: string;
  application: LamDBApplication;
  authorizer?: IHttpRouteAuthorizer;
};

export class LamDBAPI extends HttpApi {
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

    const writerIntegration = new HttpLambdaIntegration('WriterIntegration', props.application.writer);

    this.addRoutes({
      integration: writerIntegration,
      path: '/writer',
      methods,
    });
    this.addRoutes({
      integration: new HttpLambdaIntegration('ReaderIntegration', props.application.reader),
      path: '/reader',
      methods,
    });
    this.addRoutes({
      integration: new HttpLambdaIntegration('ProxyIntegration', props.application.proxy),
      path: '/graphql',
      methods,
    });

    if (this.url) {
      new CfnOutput(this, `${props.name}-url`, {
        exportName: `${props.name}-url`,
        value: this.url,
      });
    }
  }
}
