import { FileManager, litestreamReplicaFileAdapter, LitestreamService, QueryEngine, useDatabase } from '@lamdb/lambda';
import { Configuration } from './configuration';
import { startProxy } from './httpProxy';

const start = async (configuration: Configuration = new Configuration()) => {
  const litestreamService = new LitestreamService({
    binaryPath: configuration.litestreamBinaryPath,
    databasePath: configuration.databasePath,
    bucketName: configuration.litestreamBucketName,
    objectKey: configuration.litestreamObjectKey,
    accessKeyId: configuration.litestreamAccessKeyId,
    secretAccessKey: configuration.litestreamSecretAccessKey,
  });
  const fileManager = new FileManager(configuration.databasePath, litestreamReplicaFileAdapter(litestreamService));

  useDatabase(
    fileManager,
    async () => {
      const queryEngine = new QueryEngine({
        libraryPath: configuration.queryEngineBinaryPath,
        prismaSchemaPath: configuration.prismaSchemaPath,
        databaseFilePath: configuration.databasePath,
      });

      startProxy(configuration, queryEngine);
    },
    false,
  );
};

start().catch(console.error);
