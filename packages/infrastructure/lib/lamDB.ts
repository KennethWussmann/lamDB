import { Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { CorsHttpMethod, HttpApi, HttpApiProps, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { EngineLayer } from './engineLayer';
import { LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { HttpIamAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { PersistenceProps } from '@lamdb/lambda';

export type LamDBProps = {
  name: string;
  /**
   * Path to the Prisma schema file
   */
  schemaPath: string;
  /**
   * Time a reader instance will cache a database file. Once downloaded the lambda won't download an updated file for the configured amount of time.
   * Introduces drift between writer and reader for the sake of performance. Set to 0 to disable = always download fresh file.
   * Readers don't upload database files.
   * @default Duration.seconds(30)
   */
  readerCacheDuration?: Duration;
  /**
   * Time a writer instance will cache a database file. Usually a writer is the source of truth and does not need to download the database often.
   * Introduces drift between writer and S3 for the sake of performance. Set to 0 to disable.
   * Database files will always be uploaded at the end of a request.
   * @default Duration.minutes(30)
   */
  writerCacheDuration?: Duration;
  writerFunction: { entry: string } & Partial<LamDBFunctionProps>;
  readerFunction?: { entry: string } & Partial<LamDBFunctionProps>;
  proxyFunction?: { entry: string } & Partial<LamDBFunctionProps>;
  /**
   * Expose a GET /playground route on the writer to access a graphical user interface for the database
   * @default false
   */
  enablePlayground?: boolean;
  /**
   * Expose additional GraphQL queries to execute raw SQL
   * @default false
   */
  enableRawQueries?: boolean;
  /**
   * Log level of LamDB and subprocesses.
   * @default info
   */
  logLevel?: 'info' | 'debug' | 'error';
  /**
   * Control where and how the database will be persisted.
   * @default S3 with Litestream
   */
  persistence?: PersistenceProps;
} & Pick<HttpApiProps, 'defaultAuthorizer'>;

const defaultPersistenceProps: PersistenceProps = {
  type: 's3',
  enableLitestream: true,
};

export class LamDB extends Construct {
  private api: HttpApi;
  public databaseStorageBucket: IBucket;
  private engineLayer: LayerVersion;

  constructor(scope: Construct, id: string, private props: LamDBProps) {
    super(scope, id);

    this.engineLayer = new EngineLayer(this, 'PrismaEngineLayer');

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
      defaultAuthorizer: this.props.defaultAuthorizer,
    });

    const reader = this.createLambda(
      'ReaderFunction',
      {
        functionName: `${props.name}-reader`,
        handler: 'readerHandler',
        ...(props.readerFunction ?? props.writerFunction),
      },
      {
        CACHE_SECONDS: `${(this.props.readerCacheDuration ?? Duration.seconds(30)).toSeconds()}`,
      },
    );
    const writer = this.createLambda(
      'WriterFunction',
      {
        functionName: `${props.name}-writer`,
        handler: 'writerHandler',
        //reservedConcurrentExecutions: 1,
        ...props.writerFunction,
      },
      {
        ENABLE_PLAYGROUND: this.props.enablePlayground ? 'true' : 'false',
        CACHE_SECONDS: `${(this.props.writerCacheDuration ?? Duration.seconds(30)).toSeconds()}`,
      },
    );
    const proxy = this.createLambda('ProxyFunction', {
      functionName: `${props.name}-proxy`,
      handler: 'proxyHandler',
      ...(props.proxyFunction ?? props.writerFunction),
    });

    this.addApiRoutes(writer, reader, proxy);
  }

  private addApiRoutes = (writer: LamDBFunction, reader: LamDBFunction, proxy: LamDBFunction) => {
    const methods = [HttpMethod.POST, HttpMethod.OPTIONS];

    const writerIntegration = new HttpLambdaIntegration('WriterIntegration', writer);
    if (this.props.enablePlayground) {
      this.api.addRoutes({
        integration: writerIntegration,
        path: '/playground',
        methods: [...methods, HttpMethod.GET],
      });
      this.api.addRoutes({
        integration: writerIntegration,
        path: '/sdl',
        methods: [...methods, HttpMethod.GET],
      });
    }

    const writerRoute = this.api.addRoutes({
      integration: writerIntegration,
      path: '/writer',
      methods,
    });
    const readerRoute = this.api.addRoutes({
      integration: new HttpLambdaIntegration('ReaderIntegration', reader),
      path: '/reader',
      methods,
    });
    this.api.addRoutes({
      integration: new HttpLambdaIntegration('ProxyIntegration', proxy),
      path: '/graphql',
      methods,
    });
    if (this.props.defaultAuthorizer && this.props.defaultAuthorizer instanceof HttpIamAuthorizer) {
      writerRoute[0].grantInvoke(proxy);
      readerRoute[0].grantInvoke(proxy);
    }
  };

  private grantGeneralLambdaPermissions = (fn: LamDBFunction) => {
    this.databaseStorageBucket.grantReadWrite(fn);
  };

  private persistenceProps = this.props.persistence ?? defaultPersistenceProps;
  private isLitestreamEnabled = () => this.persistenceProps.type === 's3' && this.persistenceProps.enableLitestream;

  private createLambda = (
    id: string,
    props: LamDBFunctionProps,
    additionalEnvironmentVariables: Record<string, string> = {},
  ): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      environment: {
        LOG_LEVEL: this.props.logLevel ?? 'info',
        GRAPHQL_API_BASE_URL: this.api.url ?? '',
        DATABASE_STORAGE_BUCKET_NAME: this.databaseStorageBucket.bucketName,
        ENABLE_RAW_QUERIES: this.props.enableRawQueries ? 'true' : 'false',
        ENABLE_LITESTREAM: this.isLitestreamEnabled() ? 'true' : 'false',
        PERSISTENCE_TYPE: this.persistenceProps.type,
        ...additionalEnvironmentVariables,
      },
      layers: [this.engineLayer],
      bundling: {
        commandHooks: {
          afterBundling: () => [],
          beforeInstall: () => [],
          beforeBundling: (_, outputDir: string) => [
            `echo "Copying prisma schema from ${this.props.schemaPath} to ${outputDir}"`,
            `cp ${this.props.schemaPath} ${outputDir}`,
          ],
        },
      },
      ...props,
    });
    this.grantGeneralLambdaPermissions(fn);
    return fn;
  };
}
