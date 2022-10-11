import { Merge } from '../../types';
import { litestreamReplicaFileAdapter, litestreamRestoreFileAdapter } from './litestream/litestreamFileAdapter';
import { LitestreamService, LitestreamServiceSettings } from './litestream/litestreamService';
import { noOpFileAdapater } from './noOpFileAdapter';
import { s3FileAdapter } from './s3FileAdapter';

export type PersistenceType = 's3' | 'efs';
export type S3PersistenceProps = {
  enableLitestream: boolean;
  bucketName: string;
};
export type EFSPersistenceProps = {
  //
};

export type PersistenceProps = {
  type: PersistenceType;
  databaseFilePath: string;
} & (Merge<{ type: 's3' }, S3PersistenceProps> | Merge<{ type: 'efs' }, EFSPersistenceProps>);

export type FileAdapter = {
  download: (destination: string) => Promise<void>;
  upload: (origin: string) => Promise<void>;
};

let fileAdapter: FileAdapter | undefined;

export const getFileAdapter = (
  writer: boolean,
  persistenceProps: PersistenceProps = getEnvironmentPersistenceConfig(),
): FileAdapter => {
  if (fileAdapter) {
    return fileAdapter;
  }
  if (persistenceProps.type === 's3') {
    if (persistenceProps.enableLitestream ?? true) {
      const litestreamSettings: LitestreamServiceSettings = {
        binaryPath: '/opt/litestream',
        bucketName: persistenceProps.bucketName,
        objectKey: 'litestream',
        databasePath: persistenceProps.databaseFilePath,
      };

      fileAdapter = writer
        ? litestreamReplicaFileAdapter(new LitestreamService(litestreamSettings))
        : litestreamRestoreFileAdapter(new LitestreamService(litestreamSettings));
    } else {
      fileAdapter = s3FileAdapter(persistenceProps.databaseFilePath);
    }
  } else {
    fileAdapter = noOpFileAdapater;
  }
  return fileAdapter;
};

export const getEnvironmentPersistenceConfig = (): PersistenceProps => {
  const databaseFilePath = process.env.DATABASE_FILE_PATH ?? '/tmp/database.db';
  if (process.env.PERSISTENCE_TYPE === 'efs') {
    return { type: 'efs', databaseFilePath };
  } else {
    return {
      type: 's3',
      databaseFilePath,
      bucketName: process.env.DATABASE_STORAGE_BUCKET_NAME!,
      enableLitestream: process.env.ENABLE_LITESTREAM === 'true',
    };
  }
};
