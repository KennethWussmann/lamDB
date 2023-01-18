import { HttpApiProps } from '@aws-cdk/aws-apigatewayv2-alpha';
import { LogLevel } from '@lamdb/commons';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { LamDBApiTokenAuthorizerTokenProps } from './lamDBApiTokenAuthorizer';
import { EfsBastionHostProps } from './lamDBBastionHost';
import { LamDBFunctionProps } from './lamDBFunction';

export type LamDBDataSyncProps = {
  /**
   * Cron expression when to execute the sync task
   * @default hourly
   */
  scheduleExpression?: Schedule;
};

export type LamDBEFSPersistenceProps = {
  /**
   * Also deploy a small tier EC2 instance to use as bastion host that can access the EFS.
   * Great for debugging or maintenance, otherwise not necessary for operation.
   * @default false
   */
  bastionHost?: EfsBastionHostProps | boolean;
  /**
   * Use AWS DataSync to synchronize with an S3 bucket.
   * Great for backups, debugging, maintenance, data recovery.
   * @default false
   */
  s3Sync?: LamDBDataSyncProps | boolean;
};

export type LambdaFunctionType = 'writer' | 'reader' | 'migrate' | 'authorizer' | 'token-rotation';
export type LamDBLambdaOverwritesProps = {
  /**
   * Optionally overwrite properties of lambdas.
   * @default undefined
   */
  overwrites?: Partial<Record<LambdaFunctionType, Partial<LamDBFunctionProps>>>;
  provisionedConcurrency?: Partial<Record<'writer' | 'reader', number>>;
};

export type LamDBProps = {
  name: string;
  /**
   * Path to the Prisma schema file
   */
  schemaPath: string;
  /**
   * Adjust properties about lambdas
   * @default undefined
   */
  lambda?: LamDBLambdaOverwritesProps;
  /*
   * Log level of LamDB and subprocesses
   * @default info
   */
  logLevel?: LogLevel;
  /**
   * Enable API Gateway access logging
   * @default false
   */
  accessLogging?: boolean;
  /**
   * Further configure EFS specific settings
   */
  efs?: LamDBEFSPersistenceProps;
  /**
   * Configure api tokens to enable token-based auth.
   * Token-based auth is considered less secure and further delays requests to the request. Specify a rotation period whenever possible.
   * @default undefined No token auth
   */
  apiTokens?: LamDBApiTokenAuthorizerTokenProps[];
  /**
   * Enable tracing reporting to AWS X-Ray.
   * Usually only used for development of lamDB, but can also help to understand access patterns.
   * Notice that during tracing the operation fragment inlining does not work.
   * @default false
   */
  tracing?: boolean;
  /**
   * Enable metrics reporting to CloudWatch.
   * @default true
   **/
  metrics?: boolean;
  /**
   * Modify the incoming GraphQL operations to increase compatiblity with Prisma Query Engine.
   * The Prisma query engine does not support some GraphQL features like variables and fragments. LamDB can optimize the operation on-the-fly to increase compatability.
   * This comes at runtime overhead and should be avoided if possible. If you can do without some features of GraphQL, you should disable this optimization in favor of performance.
   *
   * You can also safely disable this when you are only using Prisma client.
   * @default true
   */
  operationOptimization?: boolean;
} & Pick<HttpApiProps, 'defaultAuthorizer'>;

export type LambdaFileType = 'js' | 'ts';
