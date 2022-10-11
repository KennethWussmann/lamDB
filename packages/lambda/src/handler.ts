import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Response } from './requestResponse';
import { createLogger } from './logger';
import { QueryEngine } from './queryEngine/queryEngine';
import { databaseFilePath, useDatabase } from './database/fileManager';
import {
  FileManager,
  litestreamReplicaFileAdapter,
  defaultFileAdapter,
  LitestreamService,
  LitestreamServiceSettings,
  litestreamRestoreFileAdapter,
} from './database';

const logger = createLogger({ name: 'LambdaHandler' });
const queryEngine = new QueryEngine({
  databaseFilePath,
  binaryPath: '/opt/query-engine',
  prismaSchemaPath: './schema.prisma',
  enablePlayground: process.env.ENABLE_PLAYGROUND === 'true',
  enableRawQueries: process.env.ENABLE_RAW_QUERIES === 'true',
});

let fileManager: FileManager | undefined;

const getFileManager = (reader: boolean): FileManager => {
  if (fileManager) {
    return fileManager;
  }
  if (!process.env.DATABASE_STORAGE_BUCKET_NAME) {
    throw new Error('Env var DATABASE_STORAGE_BUCKET_NAME missing');
  }

  const litestreamSettings: LitestreamServiceSettings = {
    binaryPath: '/opt/litestream',
    bucketName: process.env.DATABASE_STORAGE_BUCKET_NAME,
    objectKey: 'litestream',
    databasePath: databaseFilePath,
  };
  fileManager = new FileManager(
    databaseFilePath,
    process.env.ENABLE_LITESTREAM === 'true'
      ? reader
        ? litestreamRestoreFileAdapter(new LitestreamService(litestreamSettings))
        : litestreamReplicaFileAdapter(new LitestreamService(litestreamSettings))
      : defaultFileAdapter,
  );
  return fileManager;
};

const handleRequest = async (
  uploadAfterWrite: boolean,
  request: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const response: Response = await useDatabase(
    async (): Promise<Response> => {
      queryEngine.initialize();

      try {
        const response = await queryEngine.proxy({
          path: request.requestContext.http.path.toLowerCase() === '/sdl' ? '/sdl' : '/',
          method: request.requestContext.http.method,
          headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value ?? ''])),
          body: request.body,
        });
        return response;
      } catch (e: any) {
        logger.error('Failed to proxy request', { error: e?.message, request });
        return {
          status: 400,
          body: JSON.stringify({
            data: null,
            errors: [
              {
                message: `Failed to proxy request: ${e?.message}`,
              },
            ],
          }),
          headers: {
            'content-type': 'application/json',
          },
        };
      }
    },
    uploadAfterWrite,
    getFileManager(!uploadAfterWrite),
  );

  return {
    headers: response.headers,
    body: response.body,
    statusCode: response.status,
  };
};

export const readerHandler = async (request: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> =>
  await handleRequest(false, request);
export const writerHandler = async (request: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> =>
  await handleRequest(true, request);
export const proxyHandler = () => {
  logger.debug('proxy');
};
