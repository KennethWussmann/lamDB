import { APIGatewayProxyEventV2, Context, Handler } from 'aws-lambda';
import { fromApiGatwayRequest, isRequest, toApiGatewayResponse } from '../utils';
import { Request, tracer } from '@lamdb/commons';
import { defaultApplicationContext } from '../applicationContext';
import { DeferredService } from './deferredService';

export class DeferredHandler {
  constructor(private service: DeferredService = defaultApplicationContext.deferredService) {}

  @tracer.captureLambdaHandler({ captureResponse: false })
  async handler(request: APIGatewayProxyEventV2 | Request, _: Context) {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);

    const lamDBRequest = isRequest(request) ? request : fromApiGatwayRequest(request);

    return toApiGatewayResponse(await this.service.execute(lamDBRequest));
  }
}

const handlerClass = new DeferredHandler();
export const deferredHandler: Handler = handlerClass.handler.bind(handlerClass);
