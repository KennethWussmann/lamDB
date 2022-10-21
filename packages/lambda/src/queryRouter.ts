import { createLogger } from '../../core/src/logger';
import { Request, Response } from '../../core/src/requestResponse';
import { fromApiGatewayResponse, getOperationInfo, graphQlErrorResponse } from './utils';
import { Lambda } from '@aws-sdk/client-lambda';
import { errorLog } from '@lamdb/core';

const logger = createLogger({ name: 'QueryRouter' });

export const invokeFunction = async (
  lambdaClient: Lambda,
  functionArn: string,
  request: Request,
  retry: boolean,
  retryAttempts = 3,
): Promise<Response> => {
  if (retryAttempts <= 0) {
    throw new Error('Request failed: Max retry attempts reached');
  }
  logger.debug('Invoking lambda', { functionArn, request, retry, retryAttempts });

  try {
    const result = await lambdaClient.invoke({
      FunctionName: functionArn,
      Payload: Buffer.from(JSON.stringify(request)),
    });
    if (result.Payload) {
      return fromApiGatewayResponse(JSON.parse(Buffer.from(result.Payload).toString('utf8')));
    } else {
      throw new Error('Request failed: Failed to parse lambda response payload');
    }
  } catch (e: any) {
    if (e?.name === 'TooManyRequestsException') {
      logger.debug('Lambda invocation rate exceeded, retrying', { retryAttempts });
      return invokeFunction(lambdaClient, functionArn, request, retry, retryAttempts - 1);
    }
    throw e;
  }
};

export const routeQuery = async (
  request: Request,
  writerFunctionArn = 'writer',
  readerFunctionArn = 'reader',
  lambdaClient: Lambda = new Lambda({}),
): Promise<Response> => {
  try {
    const operationInfo = getOperationInfo(request);
    logger.debug('Parsed operation', { operationInfo });

    if (!operationInfo) {
      return graphQlErrorResponse(`Failed to route request: Could not determine GraphQL operation type`);
    }

    if (operationInfo.type !== 'mutation' && operationInfo.type !== 'query') {
      return graphQlErrorResponse(`Failed to route request: Unsupported operation type '${operationInfo.type}'`);
    }

    return await invokeFunction(
      lambdaClient,
      operationInfo.type === 'mutation' ? writerFunctionArn : readerFunctionArn,
      {
        ...request,
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
          // Add extra headers to allow caching
          'x-lamdb-router': 'true',
          'x-lamdb-operation-type': operationInfo.type,
          'x-lamdb-operation-name': operationInfo.name,
          ...(operationInfo.hash ? { 'x-lamdb-operation-hash': operationInfo.hash } : {}),
        },
      },
      operationInfo.type === 'mutation',
    );
  } catch (e: any) {
    logger.debug('Failed to execute request', errorLog(e));
    return graphQlErrorResponse(`Failed to route request: ${e.message}`);
  }
};
