import { fromApiGatewayResponse, graphQlErrorResponse } from './utils';
import { Lambda } from '@aws-sdk/client-lambda';
import { getOperationInfo, errorLog, tracer, createLogger, Request, Response } from '@lamdb/commons';

const logger = createLogger({ name: 'QueryRouter' });

export class QueryRouter {
  @tracer.captureMethod({ captureResponse: false })
  private async invokeFunction(lambdaClient: Lambda, functionArn: string, request: Request, retry: boolean, retryAttempts = 3): Promise<Response> {
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
        return this.invokeFunction(lambdaClient, functionArn, request, retry, retryAttempts - 1);
      }
      throw e;
    }
  }

  @tracer.captureMethod({ captureResponse: false })
  async routeQuery(lambdaClient: Lambda, request: Request, writerFunctionArn = 'writer', readerFunctionArn = 'reader'): Promise<Response> {
    try {
      const operationInfo = getOperationInfo(request);
      logger.debug('Parsed operation', { operationInfo });

      if (!operationInfo) {
        return graphQlErrorResponse('Failed to route request: Could not determine GraphQL operation type');
      }

      if (operationInfo.type !== 'mutation' && operationInfo.type !== 'query') {
        return graphQlErrorResponse(`Failed to route request: Unsupported operation type '${operationInfo.type}'`);
      }

      return await this.invokeFunction(
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
  }
}
