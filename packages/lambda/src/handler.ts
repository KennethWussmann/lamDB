import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Callback, Context, Handler } from 'aws-lambda';
import { getRequestFromUnion, isRequest, toApiGatewayResponse } from './utils';
import { routeQuery } from './queryRouter';
import { createLogger, Request } from '@lamdb/core';
import { getLamDBService, LamDBConfiguration } from '@lamdb/api-router';
import serverlessExpress from '@vendia/serverless-express';
import express from 'express';

const logger = createLogger({ name: 'LambdaHandler' });
const app = express();

export const readerHandler = async (
  request: APIGatewayProxyEventV2 | Request,
  context: Context,
  callback: Callback<APIGatewayProxyResultV2>,
): Promise<APIGatewayProxyResultV2> => {
  const service = getLamDBService(new LamDBConfiguration());
  if (isRequest(request)) {
    return toApiGatewayResponse(await service.execute(request));
  }
  return serverlessExpress({
    app,
  })(request, context, callback);
};

export const writerHandler: Handler = async (
  request: APIGatewayProxyEventV2 | Request,
  context: Context,
  callback: Callback<APIGatewayProxyResultV2>,
): Promise<APIGatewayProxyResultV2> => {
  const service = getLamDBService(new LamDBConfiguration());
  if (isRequest(request)) {
    return toApiGatewayResponse(await service.execute(request));
  }
  return serverlessExpress({
    app,
  })(request, context, callback);
};

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

export const migrateHandler = async () => {
  const service = getLamDBService(new LamDBConfiguration());
  await service.migrate();
};
