import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { getOperationInfo, getRequestFromUnion, graphQlErrorResponse, toApiGatewayResponse } from './utils';
import { routeQuery } from './queryRouter';
import { createLogger, Request, getQueryEngine, errorLog, getMigrationEngine } from '@lamdb/core';

const logger = createLogger({ name: 'LambdaHandler' });
const databaseFilePath = process.env.DATABASE_FILE_PATH!;
const prismaSchemaPath = './schema.prisma';

const handleRequest = async (writer: boolean, request: Request): Promise<APIGatewayProxyResultV2> => {
  const operationInfo = getOperationInfo(request);

  if (!writer && operationInfo?.type === 'mutation') {
    return toApiGatewayResponse(graphQlErrorResponse('Cannot execute mutations in read-only mode'));
  }

  if (writer && process.env.AUTO_MIGRATE?.toLowerCase() === 'true') {
    await migrateHandler();
  }

  const queryEngine = getQueryEngine({
    databaseFilePath,
    prismaSchemaPath,
    libraryPath: '/opt/libquery-engine.node',
  });

  try {
    return toApiGatewayResponse(
      await queryEngine.execute({
        ...request,
        path: request?.path?.toLowerCase() === '/sdl' ? '/sdl' : '/',
      }),
    );
  } catch (e: any) {
    logger.error('Failed to proxy request', errorLog(e));
    return toApiGatewayResponse(graphQlErrorResponse(`Failed to proxy request: ${e?.message}`));
  }
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

export const migrateHandler = async (input: { force?: boolean } | undefined = undefined) =>
  getMigrationEngine({
    binaryPath: '/opt/migration-engine',
    databaseFilePath,
    prismaSchemaPath,
  }).apply(process.env.FORCE_MIGRATION?.toLowerCase() === 'true' || input?.force === true);
