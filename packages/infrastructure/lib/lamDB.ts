import { Construct } from 'constructs';
import { LamDBEngineLayer } from './lamDBEngineLayer';
import { LamDBProps } from './types';
import { LamDBAPI } from './lamDBAPI';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBApplication } from './lamDBApplication';
import { LamDBStorage } from './lamDBStorage';
import { Tags } from 'aws-cdk-lib';
import { LamDBApiTokenAuthorizer } from './lamDBApiTokenAuthorizer';
import { LamDBDataSync } from './lamDBDataSync';
import { CommonMetricOptions, IMetric } from 'aws-cdk-lib/aws-cloudwatch';
import { MetricName } from '@lamdb/commons';

export class LamDB extends Construct {
  public readonly api: LamDBAPI;
  public readonly fileSystem: LamDBFileSystem;
  public readonly application: LamDBApplication;
  public readonly storage: LamDBStorage;
  public readonly authorizer: LamDBApiTokenAuthorizer | undefined;
  public readonly dataSync: LamDBDataSync | undefined;

  constructor(scope: Construct, id: string, props: LamDBProps) {
    super(scope, id);
    this.storage = new LamDBStorage(this, 'Storage', props.name);
    this.fileSystem = new LamDBFileSystem(this, 'FileSystem', {
      name: props.name,
      databaseStorageBucket: this.storage,
    });
    this.application = new LamDBApplication(this, 'Application', {
      engineLayer: new LamDBEngineLayer(this, 'EngineLayer'),
      fileSystem: this.fileSystem,
      databaseStorageBucket: this.storage,
      name: props.name,
      logLevel: props.logLevel,
      operationOptimization: props.operationOptimization,
      schemaPath: props.schemaPath,
      tracing: props.tracing,
      metrics: props.metrics ?? true,
      overwrites: props.lambda?.overwrites,
      provisionedConcurreny: props.lambda?.provisionedConcurreny,
    });
    this.authorizer =
      props.apiTokens && props.apiTokens?.length > 0
        ? new LamDBApiTokenAuthorizer(this, 'ApiTokenAuthorizer', {
            name: props.name,
            tokens: props.apiTokens,
            lambdaFunctionProps: props.lambda?.overwrites,
            logLevel: props.logLevel,
          })
        : undefined;
    this.api = new LamDBAPI(this, 'GraphQLApi', {
      name: props.name,
      application: this.application,
      authorizer: this.authorizer?.authorizer,
      exposeReaderWriterEndpoints: props.exposeReaderWriterEndpoints,
      accessLogging: props.accessLogging,
    });

    if (props.efs?.s3Sync) {
      if (typeof props.efs.s3Sync === 'boolean' ? props.efs.s3Sync : !!props.efs.s3Sync) {
        this.dataSync = new LamDBDataSync(
          this,
          'DataSync',
          {
            name: props.name,
            scheduleExpression: typeof props.efs.s3Sync === 'boolean' ? undefined : props.efs.s3Sync.scheduleExpression,
          },
          this.fileSystem,
          this.storage,
        );
      }
    }

    Tags.of(this).add('lamdb:name', props.name);
  }

  /**
   * Number of successfully executed read operations
   * @param options
   * @returns
   */
  public metricReadOperations = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.READ_OPERATIONS, options);

  /**
   * Number of successfully executed write operations
   * @param options
   * @returns
   */
  public metricWriteOperations = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.WRITE_OPERATIONS, options);

  /**
   * Number failed operations
   * @param options
   * @returns
   */
  public metricOperationErrors = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.OPERATION_ERRORS, options);

  /**
   * Response body size in bytes for successful operations
   * @param options
   * @returns
   */
  public metricReadThroughput = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.READ_THROUGHPUT, options);

  /**
   * Request body size in bytes for successful operations
   * @param options
   * @returns
   */
  public metricWriteThroughput = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.WRITE_THROUGHPUT, options);

  /**
   * Response time of the query engine in milliseconds for successful read operations
   * @param options
   * @returns
   */
  public metricReadLatency = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.READ_LATENCY, options);

  /**
   * Response time of the query engine in milliseconds for successful write operations
   * @param options
   * @returns
   */
  public metricWriteLatency = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.WRITE_LATENCY, options);

  /**
   * Size of main database file in bytes
   * @param options
   * @returns
   **/
  public metricDatabaseSize = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.DATABASE_SIZE, options);

  /**
   * Count of applied migrations
   * @param options
   * @returns
   **/
  public metricMigrationsApplied = (options: CommonMetricOptions | undefined = undefined): IMetric =>
    this.application.metric(MetricName.MIGRATIONS_APPLIED, options);
}
