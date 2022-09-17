import { Aws, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { HttpIamAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';

export type LamDBProps = {
  name: string;
  writerFunction: { entry: string } & Partial<LamDBFunctionProps>;
  readerFunction?: { entry: string } & Partial<LamDBFunctionProps>;
  proxyFunction?: { entry: string } & Partial<LamDBFunctionProps>;
};

export class LamDB extends Construct {
  private api: HttpApi;
  public databaseStorageBucket: IBucket;

  constructor(scope: Construct, id: string, props: LamDBProps) {
    super(scope, id);

    this.databaseStorageBucket = new Bucket(this, 'DatabaseStorageBucket', {
      bucketName: `${Aws.ACCOUNT_ID}-${props.name}-database`,
      publicReadAccess: false,
      versioned: true,
      accessControl: BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.api = new HttpApi(this, 'GraphQLApi', {
      apiName: `${props.name}-api`,
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: new HttpIamAuthorizer(),
    });

    const reader = this.createLambda('ReaderFunction', {
      functionName: `${props.name}-reader`,
      handler: 'readerHandler',
      ...(props.readerFunction ?? props.writerFunction),
    });
    const writer = this.createLambda('WriterFunction', {
      functionName: `${props.name}-writer`,
      handler: 'writerHandler',
      ...props.writerFunction,
    });
    const proxy = this.createLambda('ProxyFunction', {
      functionName: `${props.name}-proxy`,
      handler: 'proxyHandler',
      ...(props.proxyFunction ?? props.writerFunction),
    });

    this.addApiRoutes(writer, reader, proxy);
  }

  private addApiRoutes = (writer: LamDBFunction, reader: LamDBFunction, proxy: LamDBFunction) => {
    const writerRoute = this.api.addRoutes({
      integration: new HttpLambdaIntegration('WriterIntegration', writer),
      path: '/writer',
      methods: [HttpMethod.POST, HttpMethod.OPTIONS],
    });
    const readerRoute = this.api.addRoutes({
      integration: new HttpLambdaIntegration('ReaderIntegration', reader),
      path: '/reader',
      methods: [HttpMethod.POST, HttpMethod.OPTIONS],
    });
    this.api.addRoutes({
      integration: new HttpLambdaIntegration('ProxyIntegration', proxy),
      path: '/graphql',
      methods: [HttpMethod.POST, HttpMethod.OPTIONS],
    });
    writerRoute[0].grantInvoke(proxy);
    readerRoute[0].grantInvoke(proxy);
  };

  private grantGeneralLambdaPermissions = (fn: LamDBFunction) => {
    this.databaseStorageBucket.grantReadWrite(fn);
  };

  private createLambda = (id: string, props: LamDBFunctionProps): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      environment: {
        GRAPHQL_API_BASE_URL: this.api.url ?? '',
        DATABASE_STORAGE_BUCKET_ARN: this.databaseStorageBucket.bucketArn,
      },
      ...props,
    });
    this.grantGeneralLambdaPermissions(fn);
    return fn;
  };
}
