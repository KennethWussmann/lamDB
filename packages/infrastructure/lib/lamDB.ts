import { Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { CorsHttpMethod, HttpApi, HttpApiProps, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { EngineLayer } from './engineLayer';
import { LayerVersion, FileSystem as LambdaFileSystem } from 'aws-cdk-lib/aws-lambda';
import { HttpIamAuthorizer } from '@aws-cdk/aws-apigatewayv2-authorizers-alpha';
import { Merge, PersistenceType } from '@lamdb/lambda';
import { AccessPoint, FileSystem } from 'aws-cdk-lib/aws-efs';
import { join } from 'path';
import { EfsBastionHost, EfsBastionHostProps } from './efsBastionHost';
import { GatewayVpcEndpointAwsService, Vpc } from 'aws-cdk-lib/aws-ec2';

export type LamDBS3PersistenceProps = {
  /**
   * Use Litestream for replication.
   * If disabled uses plain S3 operations to download and upload database file.
   * Important: Change requires replacement! Database may be empty after change.
   * @default true
   */
  enableLitestream?: boolean;
};

export type LamDBEFSBastionHostProps = {
  /**
   * Also deploy a small tier EC2 instance to use as bastion host that can access the EFS.
   * Great for debugging or maintenance, otherwise not necessary for operation.
   * @default false
   */
  enabled: boolean;
} & Pick<EfsBastionHostProps, 'kmsKey'>;

export type LamDBEFSPersistenceProps = {
  /**
   * Also deploy a small tier EC2 instance to use as bastion host that can access the EFS.
   * Great for debugging or maintenance, otherwise not necessary for operation.
   * @default false
   */
  bastionHost?: LamDBEFSBastionHostProps | boolean;
  /**
   * Use AWS DataSync to synchronize with an S3 bucket.
   * Great for backups, debugging, maintenance, data recovery.
   * @default false
   */
  enableS3Sync?: boolean;
};

export type LamDBPersistenceProps = {
  type: PersistenceType;
  /**
   * RemovalPolicy of the choosen persistance layer.
   * @default RETAIN
   */
  removalPolicy?: RemovalPolicy;
} & (Merge<{ type: 's3' }, LamDBS3PersistenceProps> | Merge<{ type: 'efs' }, LamDBEFSPersistenceProps>);

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
  persistence?: LamDBPersistenceProps;
} & Pick<HttpApiProps, 'defaultAuthorizer'>;

const efsMountPath = '/mnt/efs';

export class LamDB extends Construct {
  private api: HttpApi;
  public databaseStorageBucket: IBucket;
  public databaseStorageFileSystem: FileSystem | undefined;
  public databaseStorageFileSystemAccessPoint: AccessPoint | undefined;
  public databaseStorageEfsBastionHost: EfsBastionHost | undefined;
  public vpc: Vpc | undefined;
  private engineLayer: LayerVersion;

  constructor(scope: Construct, id: string, private props: LamDBProps) {
    super(scope, id);
    const persistenceProps = this.getPersistenceProps();

    this.engineLayer = new EngineLayer(this, 'PrismaEngineLayer');

    this.databaseStorageBucket = new Bucket(this, 'DatabaseStorageBucket', {
      bucketName: `${Aws.ACCOUNT_ID}-${props.name}-database`,
      publicReadAccess: false,
      versioned: true,
      accessControl: BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: persistenceProps.removalPolicy,
    });
    if (persistenceProps.type === 'efs') {
      this.createEfs();
    }

    this.api = new HttpApi(this, 'GraphQLApi', {
      apiName: `${props.name}-api`,
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
      defaultAuthorizer: this.props.defaultAuthorizer,
    });

    const filesystem = this.databaseStorageFileSystemAccessPoint
      ? LambdaFileSystem.fromEfsAccessPoint(this.databaseStorageFileSystemAccessPoint, efsMountPath)
      : undefined;

    const reader = this.createLambda(
      'ReaderFunction',
      {
        functionName: `${props.name}-reader`,
        handler: 'readerHandler',
        layers: [this.engineLayer],
        filesystem,
        ...(props.readerFunction ?? props.writerFunction),
      },
      {
        CACHE_SECONDS: `${(this.props.readerCacheDuration ?? Duration.seconds(30)).toSeconds()}`,
        DATABASE_FILE_PATH:
          this.getPersistenceProps().type === 'efs' ? join(efsMountPath, 'reader.db') : '/tmp/database.db',
      },
    );
    const writer = this.createLambda(
      'WriterFunction',
      {
        functionName: `${props.name}-writer`,
        handler: 'writerHandler',
        reservedConcurrentExecutions: 1,
        layers: [this.engineLayer],
        filesystem,
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
    this.databaseStorageBucket?.grantReadWrite(fn);
  };

  private getPersistenceProps = (): LamDBPersistenceProps =>
    this.props.persistence ?? {
      type: 's3',
      enableLitestream: true,
    };

  private isLitestreamEnabled = () => {
    const persistenceProps = this.getPersistenceProps();
    return persistenceProps.type === 's3' && persistenceProps.enableLitestream;
  };

  private createLambda = (
    id: string,
    props: LamDBFunctionProps,
    additionalEnvironmentVariables: Record<string, string> = {},
  ): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      environment: {
        LOG_LEVEL: this.props.logLevel ?? 'info',
        GRAPHQL_API_BASE_URL: this.api.url ?? '',
        DATABASE_STORAGE_BUCKET_NAME: this.databaseStorageBucket?.bucketName ?? '',
        ENABLE_RAW_QUERIES: this.props.enableRawQueries ? 'true' : 'false',
        ENABLE_LITESTREAM: this.isLitestreamEnabled() ? 'true' : 'false',
        PERSISTENCE_TYPE: this.getPersistenceProps().type,
        DATABASE_FILE_PATH:
          this.getPersistenceProps().type === 'efs' ? join(efsMountPath, 'database.db') : '/tmp/database.db',
        ...additionalEnvironmentVariables,
      },
      vpc: this.vpc,
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

  private createEfs = () => {
    const persistenceProps = this.getPersistenceProps();
    if (persistenceProps.type !== 'efs') {
      return;
    }
    this.vpc = new Vpc(this, 'Vpc', {
      vpcName: `${this.props.name}-vpc`,
      natGateways: 0,
      maxAzs: 2,
      gatewayEndpoints: {
        s3: {
          service: GatewayVpcEndpointAwsService.S3,
        },
      },
    });
    this.databaseStorageFileSystem = new FileSystem(this, 'IndexFileSystem', {
      removalPolicy: persistenceProps.removalPolicy ?? RemovalPolicy.RETAIN,
      encrypted: true,
      fileSystemName: this.props.name,
      vpc: this.vpc,
    });
    this.databaseStorageFileSystemAccessPoint = this.databaseStorageFileSystem.addAccessPoint('IndexAccessPoint', {
      createAcl: {
        ownerGid: '1000',
        ownerUid: '1000',
        permissions: '750',
      },
      posixUser: {
        gid: '1000',
        uid: '1000',
      },
      path: '/lambda',
    });
    if (
      typeof persistenceProps.bastionHost === 'boolean'
        ? persistenceProps.bastionHost
        : persistenceProps.bastionHost?.enabled
    ) {
      this.databaseStorageEfsBastionHost = new EfsBastionHost(this, 'EfsBastionHost', {
        name: this.props.name,
        vpc: this.vpc,
        efs: this.databaseStorageFileSystem,
        kmsKey: typeof persistenceProps.bastionHost !== 'boolean' ? persistenceProps.bastionHost?.kmsKey : undefined,
        supportBucket: this.databaseStorageBucket,
      });
    }
  };
}
