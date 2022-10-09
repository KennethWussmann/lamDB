import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Response } from './requestResponse';
import { createLogger } from './logger';
import { QueryEngine } from './queryEngine/queryEngine';
import { databaseFilePath, useDatabase } from './database/fileManager';

const logger = createLogger({ name: 'LambdaHandler' });
const queryEngine = new QueryEngine({
  databaseFilePath,
  binaryPath: '/opt/query-engine',
  prismaSchemaPath: './schema.prisma',
  enablePlayground: process.env.ENABLE_PLAYGROUND === 'true',
  enableRawQueries: process.env.ENABLE_RAW_QUERIES === 'true',
});

const handleRequest = async (
  uploadAfterWrite: boolean,
  request: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const response: Response = await useDatabase(async (): Promise<Response> => {
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
  }, uploadAfterWrite);

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
