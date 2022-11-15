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
    this.fileSystem = new LamDBFileSystem(this, 'FileSystem', props, this.storage);
    this.application = new LamDBApplication(this, 'Application', props, new LamDBEngineLayer(this, 'EngineLayer'), this.fileSystem, this.storage);
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
}
