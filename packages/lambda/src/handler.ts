import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Request, Response } from './requestResponse';
import { createLogger } from './logger';
import { getEnvironmentPersistenceConfig, getFileAdapter, getFileManager, useDatabase } from './database';
import { getQueryEngine } from './queryEngine/queryEngine';
import { errorLog, getOperationInfo, getRequestFromUnion, graphQlErrorResponse, toApiGatewayResponse } from './utils';
import { routeQuery } from './queryRouter';

const logger = createLogger({ name: 'LambdaHandler' });

const handleRequest = async (writer: boolean, request: Request): Promise<APIGatewayProxyResultV2> => {
  const operationInfo = getOperationInfo(request);

  if (!writer && operationInfo?.type === 'mutation') {
    return toApiGatewayResponse(graphQlErrorResponse('Cannot execute mutations in read-only mode'));
  }

  const persistenceProps = getEnvironmentPersistenceConfig();
  const fileManager = getFileManager(persistenceProps.databaseFilePath, getFileAdapter(writer, persistenceProps));
  const queryEngine = getQueryEngine(persistenceProps.databaseFilePath);

  const response: Response = await useDatabase(
    fileManager,
    async (): Promise<Response> => {
      try {
        return await queryEngine.execute({
          ...request,
          path: request?.path?.toLowerCase() === '/sdl' ? '/sdl' : '/',
        });
      } catch (e: any) {
        logger.error('Failed to proxy request', errorLog(e));
        return graphQlErrorResponse(`Failed to proxy request: ${e?.message}`);
      }
    },
    writer,
  );

  return toApiGatewayResponse(response);
};

export const readerHandler = async (request: APIGatewayProxyEventV2 | Request): Promise<APIGatewayProxyResultV2> =>
  await handleRequest(false, getRequestFromUnion(request));
export const writerHandler = async (request: APIGatewayProxyEventV2 | Request): Promise<APIGatewayProxyResultV2> =>
  await handleRequest(true, getRequestFromUnion(request));
export const proxyHandler = async (event: APIGatewayProxyEventV2 | Request): Promise<APIGatewayProxyResultV2> => {
  const readerFunctionArn = process.env.READER_FUNCTION_ARN;
  const writerFunctionArn = process.env.WRITER_FUNCTION_ARN;
  if (!readerFunctionArn) {
    throw new Error('Required environment variable READER_FUNCTION_ARN not set');
  }
  if (!writerFunctionArn) {
    throw new Error('Required environment variable WRITER_FUNCTION_ARN not set');
  }

  const request = getRequestFromUnion(event);
  logger.debug('Routing request to corresponding lambda', { request });

  const response = toApiGatewayResponse(await routeQuery(request, writerFunctionArn, readerFunctionArn));

  logger.debug('Returning response', { response });
  return response;
};
