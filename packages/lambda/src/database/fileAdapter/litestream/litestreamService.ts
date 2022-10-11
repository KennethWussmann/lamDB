import { ChildProcessMonitor } from '../../../childProcessMonitor';

export type LitestreamServiceSettings = {
  binaryPath: string;
  databasePath: string;
  bucketName: string;
  objectKey: string;
  accessKeyId?: string;
  secretAccessKey?: string;
};

export class LitestreamService {
  private s3Url = `s3://${this.settings.bucketName}/${this.settings.objectKey}`;
  private restoredOnce = false;
  private replicateProcess: ChildProcessMonitor = new ChildProcessMonitor(
    'LitestreamReplicate',
    this.settings.binaryPath,
    ['replicate', this.settings.databasePath, this.s3Url],
    {
      ...(this.settings.accessKeyId && this.settings.secretAccessKey
        ? {
            LITESTREAM_ACCESS_KEY_ID: this.settings.accessKeyId,
            LITESTREAM_SECRET_ACCESS_KEY: this.settings.secretAccessKey,
          }
        : {}),
    },
    true,
    (_, message: string) => message.includes('initialized db'),
    (_, message: string) => ['info', message],
  );
  private restoreProcess: ChildProcessMonitor = new ChildProcessMonitor(
    'LitestreamRestore',
    this.settings.binaryPath,
    ['restore', '-o', this.settings.databasePath, this.s3Url],
    {
      ...(this.settings.accessKeyId && this.settings.secretAccessKey
        ? {
            LITESTREAM_ACCESS_KEY_ID: this.settings.accessKeyId,
            LITESTREAM_SECRET_ACCESS_KEY: this.settings.secretAccessKey,
          }
        : {}),
    },
    false,
  );

  constructor(private settings: LitestreamServiceSettings) {}

  replicate = this.replicateProcess.initialize;

  restore = async () => {
    this.restoredOnce = true;
    await this.restoreProcess.start();
  };

  restoreOnce = async () => {
    if (this.restoredOnce) {
      return;
    }
    await this.restore();
  };
}
