import { Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl, IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { EngineLayer } from './engineLayer';
import { LayerVersion, FileSystem as LambdaFileSystem } from 'aws-cdk-lib/aws-lambda';
import { AccessPoint, FileSystem } from 'aws-cdk-lib/aws-efs';
import { dirname, join } from 'path';
import { EfsBastionHost } from './efsBastionHost';
import { GatewayVpcEndpointAwsService, Vpc } from 'aws-cdk-lib/aws-ec2';
import { LamDBProps } from './types';

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

    this.engineLayer = new EngineLayer(this, 'PrismaEngineLayer');

    this.databaseStorageBucket = new Bucket(this, 'DatabaseStorageBucket', {
      bucketName: `${Aws.ACCOUNT_ID}-${props.name}-database`,
      publicReadAccess: false,
      versioned: true,
      accessControl: BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
    this.createEfs();

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

    const reader = this.createLambda('ReaderFunction', {
      functionName: `${props.name}-reader`,
      handler: 'readerHandler',
      layers: [this.engineLayer],
      filesystem,
      vpc: this.vpc,
      ...(props.readerFunction ?? props.writerFunction),
    });
    const writer = this.createLambda(
      'WriterFunction',
      {
        functionName: `${props.name}-writer`,
        handler: 'writerHandler',
        reservedConcurrentExecutions: 1,
        layers: [this.engineLayer],
        filesystem,
        vpc: this.vpc,
        ...props.writerFunction,
      },
      {
        AUTO_MIGRATE: `${this.props.autoMigrate ?? false ? 'true' : 'false'}`,
      },
    );
    if (!this.props.autoMigrate) {
      this.createLambda('MigrateFunction', {
        functionName: `${props.name}-migrate`,
        handler: 'migrateHandler',
        reservedConcurrentExecutions: 1,
        layers: [this.engineLayer],
        timeout: Duration.minutes(10),
        filesystem,
        vpc: this.vpc,
        ...props.writerFunction,
      });
    }
    const proxy = this.createLambda(
      'ProxyFunction',
      {
        functionName: `${props.name}-proxy`,
        handler: 'proxyHandler',
        timeout: Duration.seconds(30),
        ...(props.proxyFunction ?? props.writerFunction),
      },
      {
        WRITER_FUNCTION_ARN: writer.functionArn,
        READER_FUNCTION_ARN: reader.functionArn,
      },
    );
    reader.grantInvoke(proxy);
    writer.grantInvoke(proxy);

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

    this.api.addRoutes({
      integration: writerIntegration,
      path: '/writer',
      methods,
    });
    this.api.addRoutes({
      integration: new HttpLambdaIntegration('ReaderIntegration', reader),
      path: '/reader',
      methods,
    });
    this.api.addRoutes({
      integration: new HttpLambdaIntegration('ProxyIntegration', proxy),
      path: '/graphql',
      methods,
    });
  };

  private grantGeneralLambdaPermissions = (fn: LamDBFunction) => {
    this.databaseStorageBucket?.grantReadWrite(fn);
  };

  private createLambda = (
    id: string,
    props: LamDBFunctionProps,
    additionalEnvironmentVariables: Record<string, string> = {},
  ): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      environment: {
        LOG_LEVEL: this.props.logLevel ?? 'info',
        DATABASE_STORAGE_BUCKET_NAME: this.databaseStorageBucket?.bucketName ?? '',
        DATABASE_FILE_PATH: join(efsMountPath, 'database.db'),
        ...additionalEnvironmentVariables,
      },
      bundling: {
        commandHooks: {
          afterBundling: () => [],
          beforeInstall: () => [],
          beforeBundling: (_, outputDir: string) => [
            `echo "Copying prisma schema from ${this.props.schemaPath} to ${outputDir}"`,
            `cp ${this.props.schemaPath} ${outputDir}`,
            `echo "Copying prisma migrations from ${join(
              dirname(this.props.schemaPath),
              'migrations',
            )} to ${outputDir}"`,
            `cp -r ${join(dirname(this.props.schemaPath), 'migrations')} ${outputDir}`,
          ],
        },
      },
      ...props,
    });
    this.grantGeneralLambdaPermissions(fn);
    return fn;
  };

  private createEfs = () => {
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
      removalPolicy: RemovalPolicy.RETAIN,
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
      typeof this.props.efs?.bastionHost === 'boolean' ? this.props.efs?.bastionHost : !!this.props.efs?.bastionHost
    ) {
      this.databaseStorageEfsBastionHost = new EfsBastionHost(this, 'EfsBastionHost', {
        name: this.props.name,
        vpc: this.vpc,
        efs: this.databaseStorageFileSystem,
        kmsKey: typeof this.props.efs?.bastionHost !== 'boolean' ? this.props.efs?.bastionHost?.kmsKey : undefined,
        supportBucket: this.databaseStorageBucket,
      });
    }
  };
}
