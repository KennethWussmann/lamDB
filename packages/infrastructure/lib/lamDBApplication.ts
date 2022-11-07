import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Alias, Tracing } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { dirname, join } from 'path';
import { LamDBEngineLayer } from './lamDBEngineLayer';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { LambdaFunctionType, LamDBProps } from './types';

export class LamDBApplication extends Construct {
  public readonly reader: LamDBFunction;
  public readonly readerAlias: Alias | undefined;
  public readonly writer: LamDBFunction;
  public readonly writerAlias: Alias | undefined;
  public readonly proxy: LamDBFunction;
  public readonly proxyAlias: Alias | undefined;
  public readonly migrate: LamDBFunction;

  constructor(
    scope: Construct,
    id: string,
    private props: LamDBProps,
    engineLayer: LamDBEngineLayer,
    private fileSystem: LamDBFileSystem,
    private databaseStorageBucket: IBucket,
  ) {
    super(scope, id);

    this.reader = this.createLambda('reader', 'ReaderFunction', 'readerWriter', {
      functionName: `${props.name}-reader`,
      handler: 'readerHandler',
      layers: [engineLayer],
      filesystem: fileSystem.lambdaFileSystem,
      vpc: fileSystem.vpc,
    });
    this.writer = this.createLambda('writer', 'WriterFunction', 'readerWriter', {
      functionName: `${props.name}-writer`,
      handler: 'writerHandler',
      reservedConcurrentExecutions: 1,
      layers: [engineLayer],
      filesystem: fileSystem.lambdaFileSystem,
      vpc: fileSystem.vpc,
    });
    this.migrate = this.createLambda(
      'migrate',
      'MigrateFunction',
      'migrate',
      {
        functionName: `${props.name}-migrate`,
        handler: 'migrateHandler',
        reservedConcurrentExecutions: 1,
        layers: [engineLayer],
        timeout: Duration.minutes(10),
        filesystem: fileSystem.lambdaFileSystem,
        vpc: fileSystem.vpc,
      },
      {},
      true,
    );
    this.proxy = this.createLambda(
      'proxy',
      'ProxyFunction',
      'proxy',
      {
        functionName: `${props.name}-proxy`,
        handler: 'proxyHandler',
        timeout: Duration.seconds(30),
      },
      {
        WRITER_FUNCTION_ARN: this.writer.functionArn,
        READER_FUNCTION_ARN: this.reader.functionArn,
      },
    );
    this.reader.grantInvoke(this.proxy);
    this.writer.grantInvoke(this.proxy);

    if (props.lambda?.provisionedConcurreny?.writer) {
      this.writerAlias = new Alias(this, 'WriterAlias', {
        aliasName: 'writer',
        version: this.writer.currentVersion,
        provisionedConcurrentExecutions: props.lambda.provisionedConcurreny.writer,
      });
    }
    if (props.lambda?.provisionedConcurreny?.reader) {
      this.readerAlias = new Alias(this, 'ReaderAlias', {
        aliasName: 'reader',
        version: this.reader.currentVersion,
        provisionedConcurrentExecutions: props.lambda.provisionedConcurreny.reader,
      });
    }
    if (props.lambda?.provisionedConcurreny?.proxy) {
      this.proxyAlias = new Alias(this, 'ProxyAlias', {
        aliasName: 'proxy',
        version: this.proxy.currentVersion,
        provisionedConcurrentExecutions: props.lambda.provisionedConcurreny.proxy,
      });
    }

    new CfnOutput(this, 'lamdb-migrate-arn', {
      value: this.migrate.functionArn,
      exportName: `${props.name}-migrate-arn`,
    });
  }

  private createLambda = (
    type: LambdaFunctionType,
    id: string,
    handler: string,
    props: LamDBFunctionProps,
    additionalEnvironmentVariables: Record<string, string> = {},
    includeMigrations = false,
  ): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      entry: join(__dirname, 'lambda', `${handler}.js`),
      tracing: this.props.tracing ? Tracing.ACTIVE : undefined,
      ...props,
      ...this.props.lambda?.overwrites?.[type],
      environment: {
        LOG_LEVEL: this.props.logLevel ?? 'info',
        DATABASE_STORAGE_BUCKET_NAME: this.databaseStorageBucket?.bucketName ?? '',
        DATABASE_PATH: join(this.fileSystem.efsMountPath, 'database.db'),
        QUERY_ENGINE_LIBRARY_PATH: '/opt/libquery-engine.node',
        MIGRATION_ENGINE_BINARY_PATH: '/opt/migration-engine',
        PRISMA_SCHEMA_PATH: './schema.prisma',
        DISABLE_OPERATION_OPTIMIZATION: this.props.operationOptimization === false ? 'true' : 'false',
        ...additionalEnvironmentVariables,
        ...this.props.lambda?.overwrites?.[type]?.environment,
      },
      bundling: {
        commandHooks: {
          afterBundling: () => [],
          beforeInstall: () => [],
          beforeBundling: (_, outputDir: string) => [
            `echo "Copying prisma schema from ${this.props.schemaPath} to ${outputDir}"`,
            `cp ${this.props.schemaPath} ${outputDir}`,
            ...(includeMigrations
              ? [
                  `echo "Copying prisma migrations from ${join(
                    dirname(this.props.schemaPath),
                    'migrations',
                  )} to ${outputDir}"`,
                  `cp -r ${join(dirname(this.props.schemaPath), 'migrations')} ${outputDir}`,
                ]
              : []),
          ],
          ...this.props.lambda?.overwrites?.[type]?.bundling?.commandHooks,
        },
        ...this.props.lambda?.overwrites?.[type]?.bundling,
      },
    });
    return fn;
  };
}
