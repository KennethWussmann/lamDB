import { LogLevel } from '@lamdb/commons';
import { CfnOutput, Duration } from 'aws-cdk-lib';
import { Alias, Tracing } from 'aws-cdk-lib/aws-lambda';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { dirname, join } from 'path';
import { LamDBEngineLayer } from './lamDBEngineLayer';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { LambdaFunctionType, LamDBLambdaOverwritesProps } from './types';

export type LamDBApplicationProps = {
  name: string;
  engineLayer: LamDBEngineLayer;
  fileSystem: LamDBFileSystem;
  databaseStorageBucket: IBucket;
  tracing?: boolean;
  logLevel?: LogLevel;
  operationOptimization?: boolean;
  schemaPath: string;
} & LamDBLambdaOverwritesProps;

export class LamDBApplication extends Construct {
  public readonly reader: LamDBFunction;
  public readonly readerAlias: Alias | undefined;
  public readonly writer: LamDBFunction;
  public readonly writerAlias: Alias | undefined;
  public readonly proxy: LamDBFunction;
  public readonly proxyAlias: Alias | undefined;
  public readonly migrate: LamDBFunction;

  constructor(scope: Construct, id: string, private props: LamDBApplicationProps) {
    super(scope, id);

    this.reader = this.createLambda('reader', 'ReaderFunction', 'readerWriter', {
      functionName: `${props.name}-reader`,
      handler: 'readerHandler',
      layers: [props.engineLayer],
      filesystem: props.fileSystem.lambdaFileSystem,
      vpc: props.fileSystem.vpc,
    });
    this.writer = this.createLambda('writer', 'WriterFunction', 'readerWriter', {
      functionName: `${props.name}-writer`,
      handler: 'writerHandler',
      reservedConcurrentExecutions: 1,
      layers: [props.engineLayer],
      filesystem: props.fileSystem.lambdaFileSystem,
      vpc: props.fileSystem.vpc,
    });
    this.migrate = this.createLambda(
      'migrate',
      'MigrateFunction',
      'migrate',
      {
        functionName: `${props.name}-migrate`,
        handler: 'migrateHandler',
        reservedConcurrentExecutions: 1,
        layers: [props.engineLayer],
        timeout: Duration.minutes(10),
        filesystem: props.fileSystem.lambdaFileSystem,
        vpc: props.fileSystem.vpc,
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
      false,
      false,
    );
    this.reader.grantInvoke(this.proxy);
    this.writer.grantInvoke(this.proxy);

    if (props.provisionedConcurreny?.writer) {
      this.writerAlias = new Alias(this, 'WriterAlias', {
        aliasName: 'writer',
        version: this.writer.currentVersion,
        provisionedConcurrentExecutions: props.provisionedConcurreny.writer,
      });
    }
    if (props.provisionedConcurreny?.reader) {
      this.readerAlias = new Alias(this, 'ReaderAlias', {
        aliasName: 'reader',
        version: this.reader.currentVersion,
        provisionedConcurrentExecutions: props.provisionedConcurreny.reader,
      });
    }
    if (props.provisionedConcurreny?.proxy) {
      this.proxyAlias = new Alias(this, 'ProxyAlias', {
        aliasName: 'proxy',
        version: this.proxy.currentVersion,
        provisionedConcurrentExecutions: props.provisionedConcurreny.proxy,
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
    includeSchema = true,
  ): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      entry: join(__dirname, 'lambda', `${handler}.js`),
      tracing: this.props.tracing ? Tracing.ACTIVE : undefined,
      logLevel: this.props.logLevel,
      ...props,
      ...this.props.overwrites?.[type],
      environment: {
        DATABASE_STORAGE_BUCKET_NAME: this.props.databaseStorageBucket?.bucketName ?? '',
        DATABASE_PATH: join(this.props.fileSystem.efsMountPath, 'database.db'),
        QUERY_ENGINE_LIBRARY_PATH: '/opt/libquery-engine.node',
        MIGRATION_ENGINE_BINARY_PATH: '/opt/migration-engine',
        PRISMA_SCHEMA_PATH: './schema.prisma',
        OPERATION_OPTIMIZATION: this.props.operationOptimization === true ? 'true' : 'false',
        ...additionalEnvironmentVariables,
        ...this.props.overwrites?.[type]?.environment,
      },
      bundling: {
        commandHooks: {
          afterBundling: () => [],
          beforeInstall: () => [],
          beforeBundling: (_, outputDir: string) => [
            ...(includeSchema
              ? [
                  `echo "Copying prisma schema from ${this.props.schemaPath} to ${outputDir}"`,
                  `cp ${this.props.schemaPath} ${outputDir}`,
                ]
              : []),
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
          ...this.props.overwrites?.[type]?.bundling?.commandHooks,
        },
        ...this.props.overwrites?.[type]?.bundling,
      },
    });
    return fn;
  };
}
