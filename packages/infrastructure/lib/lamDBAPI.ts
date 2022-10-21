import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Construct } from 'constructs';
import { LamDBApplication } from './lamDBApplication';
import { LamDBProps } from './types';

export class LamDBAPI extends HttpApi {
  constructor(scope: Construct, id: string, props: LamDBProps, application: LamDBApplication) {
    super(scope, id, {
      apiName: `${props.name}-api`,
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: props.defaultAuthorizer,
    });

    const methods = [HttpMethod.POST, HttpMethod.OPTIONS];

    const writerIntegration = new HttpLambdaIntegration('WriterIntegration', application.writer);

    this.addRoutes({
      integration: writerIntegration,
      path: '/writer',
      methods,
    });
    this.addRoutes({
      integration: new HttpLambdaIntegration('ReaderIntegration', application.reader),
      path: '/reader',
      methods,
    });
    this.addRoutes({
      integration: new HttpLambdaIntegration('ProxyIntegration', application.proxy),
      path: '/graphql',
      methods,
    });
  }
}
