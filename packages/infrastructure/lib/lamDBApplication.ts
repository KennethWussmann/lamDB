import { CfnOutput, Duration } from 'aws-cdk-lib';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { dirname, join } from 'path';
import { LamDBEngineLayer } from './lamDBEngineLayer';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBFunction, LamDBFunctionProps } from './lamDBFunction';
import { LamDBProps } from './types';

export class LamDBApplication extends Construct {
  public readonly reader: LamDBFunction;
  public readonly writer: LamDBFunction;
  public readonly proxy: LamDBFunction;
  public readonly migrate: LamDBFunction | undefined;

  constructor(
    scope: Construct,
    id: string,
    private props: LamDBProps,
    engineLayer: LamDBEngineLayer,
    private fileSystem: LamDBFileSystem,
    private databaseStorageBucket: IBucket,
  ) {
    super(scope, id);

    this.reader = this.createLambda('ReaderFunction', {
      functionName: `${props.name}-reader`,
      handler: 'readerHandler',
      layers: [engineLayer],
      filesystem: fileSystem.lambdaFileSystem,
      vpc: fileSystem.vpc,
    });
    this.writer = this.createLambda(
      'WriterFunction',
      {
        functionName: `${props.name}-writer`,
        handler: 'writerHandler',
        reservedConcurrentExecutions: 1,
        layers: [engineLayer],
        filesystem: fileSystem.lambdaFileSystem,
        vpc: fileSystem.vpc,
      },
      {
        AUTO_MIGRATE: `${this.props.autoMigrate ?? false ? 'true' : 'false'}`,
      },
    );
    if (!this.props.autoMigrate) {
      this.migrate = this.createLambda(
        'MigrateFunction',
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

      new CfnOutput(this, 'lamdb-migrate-arn', {
        value: this.migrate.functionArn,
        exportName: `${props.name}-migrate-arn`,
      });
    }
    this.proxy = this.createLambda(
      'ProxyFunction',
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
  }

  private createLambda = (
    id: string,
    props: LamDBFunctionProps,
    additionalEnvironmentVariables: Record<string, string> = {},
    includeMigrations = false,
  ): LamDBFunction => {
    const fn = new LamDBFunction(this, id, {
      environment: {
        LOG_LEVEL: this.props.logLevel ?? 'info',
        DATABASE_STORAGE_BUCKET_NAME: this.databaseStorageBucket?.bucketName ?? '',
        DATABASE_FILE_PATH: join(this.fileSystem.efsMountPath, 'database.db'),
        ...additionalEnvironmentVariables,
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
        },
      },
      ...props,
    });
    return fn;
  };
}
