import { APIGatewayProxyEventV2, Context, Handler } from 'aws-lambda';
import { fromApiGatwayRequest, isRequest, toApiGatewayResponse } from '../utils';
import { Request, tracer } from '@lamdb/commons';
import { defaultApplicationContext } from '../applicationContext';

class ReaderWriterHandler {
  constructor(private endpointType: 'reader' | 'writer') {}

  @tracer.captureLambdaHandler({ captureResponse: false })
  async handler(request: APIGatewayProxyEventV2 | Request, _: Context) {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);
    const { service } = defaultApplicationContext;

    if (isRequest(request)) {
      return toApiGatewayResponse(await service.execute(request, this.endpointType));
    }
    return toApiGatewayResponse(await service.execute(fromApiGatwayRequest(request), this.endpointType));
  }
}

const readerClass = new ReaderWriterHandler('reader');
const writerClass = new ReaderWriterHandler('writer');

export const readerHandler: Handler = readerClass.handler;
export const writerHandler: Handler = writerClass.handler;
