import { Construct } from 'constructs';
import { LamDBEngineLayer } from './lamDBEngineLayer';
import { LamDBProps } from './types';
import { LamDBAPI } from './lamDBAPI';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBApplication } from './lamDBApplication';
import { LamDBStorage } from './lamDBStorage';

export class LamDB extends Construct {
  public readonly api: LamDBAPI;
  public readonly fileSystem: LamDBFileSystem;
  public readonly application: LamDBApplication;
  public readonly storage: LamDBStorage;

  constructor(scope: Construct, id: string, props: LamDBProps) {
    super(scope, id);
    this.storage = new LamDBStorage(this, 'Storage', props.name);
    this.fileSystem = new LamDBFileSystem(this, 'FileSystem', props, this.storage);
    this.application = new LamDBApplication(
      this,
      'Application',
      props,
      new LamDBEngineLayer(this, 'EngineLayer'),
      this.fileSystem,
      this.storage,
    );
    this.api = new LamDBAPI(this, 'GraphQLApi', props, this.application);
  }
}
