import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Response } from './requestResponse';
import { createLogger } from './logger';
import { getEnvironmentPersistenceConfig, getFileAdapter, getFileManager, useDatabase } from './database';
import { getQueryEngine } from './queryEngine/queryEngine';
import { fromApiGatwayRequest, graphQlErrorResponse, toApiGatewayResponse } from './utils';
import { routeQuery } from './queryRouter';

const logger = createLogger({ name: 'LambdaHandler' });

const handleRequest = async (
  uploadAfterWrite: boolean,
  request: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  const persistenceProps = getEnvironmentPersistenceConfig();
  const fileManager = getFileManager(
    persistenceProps.databaseFilePath,
    getFileAdapter(uploadAfterWrite, persistenceProps),
  );
  const queryEngine = getQueryEngine(persistenceProps.databaseFilePath);

  const response: Response = await useDatabase(
    fileManager,
    async (): Promise<Response> => {
      queryEngine.initialize();

      try {
        return await queryEngine.proxy({
          ...fromApiGatwayRequest(request),
          path: request.requestContext.http.path.toLowerCase() === '/sdl' ? '/sdl' : '/',
        });
      } catch (e: any) {
        logger.error('Failed to proxy request', { error: e?.message, request });
        return graphQlErrorResponse(`Failed to proxy request: ${e?.message}`);
      }
    },
    uploadAfterWrite,
  );

  return toApiGatewayResponse(response);
};

export const readerHandler = async (request: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> =>
  await handleRequest(false, request);
export const writerHandler = async (request: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> =>
  await handleRequest(true, request);
export const proxyHandler = async (request: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const baseUrl = process.env.GRAPHQL_API_BASE_URL;
  if (!baseUrl) {
    throw new Error('Required environment variable GRAPHQL_API_BASE_URL not set');
  }

  return toApiGatewayResponse(await routeQuery(fromApiGatwayRequest(request), baseUrl));
};
