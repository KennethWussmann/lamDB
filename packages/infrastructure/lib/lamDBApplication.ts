import { LogLevel, MetricName } from '@lamdb/commons';
import { CfnOutput, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { CommonMetricOptions, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { AttributeType, BillingMode, ITable, StreamViewType, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { Alias, FilterCriteria, FilterRule, StartingPosition, Tracing } from 'aws-cdk-lib/aws-lambda';
import { DynamoEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { dirname, join } from 'path';
import { LamDBEngineLayer } from './lamDBEngineLayer';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { LambdaFileType, LambdaFunctionType, LamDBLambdaOverwritesProps } from './types';

export type LamDBApplicationProps = {
  name: string;
  engineLayer: LamDBEngineLayer;
  fileSystem: LamDBFileSystem;
  databaseStorageBucket: IBucket;
  tracing?: boolean;
  logLevel?: LogLevel;
  operationOptimization?: boolean;
  schemaPath: string;
  metrics?: boolean;
} & LamDBLambdaOverwritesProps;

export class LamDBApplication extends Construct {
  public readonly reader: LamDBFunction;
  public readonly readerAlias: Alias | undefined;
  public readonly writer: LamDBFunction;
  public readonly writerAlias: Alias | undefined;
  public readonly deferred: LamDBFunction;
  public readonly deferredAlias: Alias | undefined;
  public readonly dynamoDbStream: LamDBFunction;
  public readonly dynamoDbStreamAlias: Alias | undefined;
  public readonly proxy: LamDBFunction;
  public readonly proxyAlias: Alias | undefined;
  public readonly migrate: LamDBFunction;

  private dynamoDbTable: ITable;

  constructor(
    scope: Construct,
    id: string,
    private props: LamDBApplicationProps,
    private lambdaFileType: LambdaFileType = 'js',
  ) {
    super(scope, id);

    this.dynamoDbTable = new Table(this, 'Table', {
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: this.props.name,
      partitionKey: {
        name: 'pk',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'sk',
        type: AttributeType.STRING,
      },
      stream: StreamViewType.NEW_IMAGE,
    });

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
    this.deferred = this.createLambda('reader', 'DeferredFunction', 'deferred', {
      functionName: `${props.name}-deferred`,
      handler: 'deferredHandler',
      layers: [props.engineLayer],
      filesystem: props.fileSystem.lambdaFileSystem,
      vpc: props.fileSystem.vpc,
      timeout: Duration.seconds(30),
    });

    this.dynamoDbStream = this.createLambda('reader', 'DynamoDBStreamFunction', 'dynamoDbStream', {
      functionName: `${props.name}-dynamodb-stream`,
      handler: 'dynamoDbStreamHandler',
      layers: [props.engineLayer],
      filesystem: props.fileSystem.lambdaFileSystem,
      vpc: props.fileSystem.vpc,
      reservedConcurrentExecutions: 1,
    });
    this.dynamoDbStream.addEventSource(
      new DynamoEventSource(this.dynamoDbTable, {
        startingPosition: StartingPosition.TRIM_HORIZON,
        batchSize: 50,
        bisectBatchOnError: true,
        retryAttempts: 3,
        filters: [FilterCriteria.filter({ dynamodb: { Keys: { pk: { S: FilterRule.beginsWith('request#') } } } })],
      }),
    );
    this.dynamoDbTable.grantReadWriteData(this.deferred);
    this.dynamoDbTable.grantReadWriteData(this.dynamoDbStream);

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
      entry: join(__dirname, 'lambda', `${handler}.${this.lambdaFileType}`),
      tracing: this.props.tracing ? Tracing.ACTIVE : undefined,
      logLevel: this.props.logLevel,
      metrics: this.props.metrics,
      metricNamespace: this.props.name,
      ...props,
      ...this.props.overwrites?.[type],
      environment: {
        DYNAMODB_TABLE_NAME: this.dynamoDbTable.tableName,
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

  public metric = (name: MetricName, options: CommonMetricOptions = {}): Metric =>
    new Metric({
      metricName: name,
      namespace: this.props.name,
      ...options,
    });
}
