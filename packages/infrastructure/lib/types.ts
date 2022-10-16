import { HttpApiProps } from '@aws-cdk/aws-apigatewayv2-alpha';
import { Merge, PersistenceType } from '@lamdb/lambda';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { EfsBastionHostProps } from './efsBastionHost';
import { LamDBFunctionProps } from './lamDBFunction';

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
