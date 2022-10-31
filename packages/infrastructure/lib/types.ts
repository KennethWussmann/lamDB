import { HttpApiProps } from '@aws-cdk/aws-apigatewayv2-alpha';
import { LamDBApiTokenAuthorizerTokenProps } from './lamDBApiTokenAuthorizer';
import { EfsBastionHostProps } from './lamDBBastionHost';
import { LamDBFunctionProps } from './lamDBFunction';

export type LamDBEFSPersistenceProps = {
  /**
   * Also deploy a small tier EC2 instance to use as bastion host that can access the EFS.
   * Great for debugging or maintenance, otherwise not necessary for operation.
   * @default false
   */
  bastionHost?: Pick<EfsBastionHostProps, 'kmsKey'> | boolean;
  /**
   * Use AWS DataSync to synchronize with an S3 bucket.
   * Great for backups, debugging, maintenance, data recovery.
   * @default false
   */
  enableS3Sync?: boolean;
};

export type LamDBProps = {
  name: string;
  /**
   * Path to the Prisma schema file
   */
  schemaPath: string;
  /**
   * Optionally overwrite properties of all lambdas.
   * @default undefined
   */
  lambdaFunctionProps?: Partial<LamDBFunctionProps>;
  /**
   * Log level of LamDB and subprocesses.
   * @default info
   */
  logLevel?: 'info' | 'debug' | 'error';
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
   * Create API endpoints for POST /reader and POST /writer
   * Usually they respond quicker than the default POST /proxy but users need to make sure to separate read/write actions themselves
   * @default false
   */
  exposeReaderWriterEndpoints?: boolean;
} & Pick<HttpApiProps, 'defaultAuthorizer'>;
