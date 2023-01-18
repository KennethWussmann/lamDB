import { APIGatewayProxyEventV2, Context, Handler } from 'aws-lambda';
import { fromApiGatwayRequest, isRequest, toApiGatewayResponse } from '../utils';
import { Request, tracer } from '@lamdb/commons';
import { defaultApplicationContext } from '../applicationContext';
import { OrchestrationService } from '../orchestrationService';

export class GraphQLHandler {
  constructor(private service: OrchestrationService = defaultApplicationContext.orchestrationService) {}

  @tracer.captureLambdaHandler({ captureResponse: false })
  async handler(request: APIGatewayProxyEventV2 | Request, _: Context) {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);

    const lamDBRequest = isRequest(request) ? request : fromApiGatwayRequest(request);

    return toApiGatewayResponse(await this.service.execute(lamDBRequest));
  }
}

const handlerClass = new GraphQLHandler();
export const graphQLHandler: Handler = handlerClass.handler.bind(handlerClass);
