import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Context } from 'aws-lambda';
import { getRequestFromUnion, toApiGatewayResponse } from '../utils';
import { createLogger, Request, tracer } from '@lamdb/commons';
import { LambdaInterface } from '@aws-lambda-powertools/commons';
import { QueryRouter } from '../queryRouter';
import { Lambda } from '@aws-sdk/client-lambda';

const lambdaClient = tracer.captureAWSv3Client(new Lambda({}));
const logger = createLogger({ name: 'ProxyHandler' });
const queryRouter = new QueryRouter();

class ProxyHandler implements LambdaInterface {
  @tracer.captureLambdaHandler({ captureResponse: false })
  public async handler(event: APIGatewayProxyEventV2 | Request, _: Context): Promise<APIGatewayProxyResultV2> {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);
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

    const response = toApiGatewayResponse(
      await queryRouter.routeQuery(lambdaClient, request, writerFunctionArn, readerFunctionArn),
    );

    logger.debug('Returning response', { response });

    return response;
  }
}

const handlerClass = new ProxyHandler();
export const proxyHandler = handlerClass.handler;
