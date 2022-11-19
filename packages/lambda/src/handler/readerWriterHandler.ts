import { APIGatewayProxyEventV2, Context, Handler } from 'aws-lambda';
import { fromApiGatwayRequest, isRequest, toApiGatewayResponse } from '../utils';
import { Request, tracer } from '@lamdb/commons';
import { defaultApplicationContext } from '../applicationContext';
import { LamDBService } from '@lamdb/core';

export class ReaderWriterHandler {
  constructor(
    private endpointType: 'reader' | 'writer',
    private service: LamDBService = defaultApplicationContext.service,
  ) {}

  @tracer.captureLambdaHandler({ captureResponse: false })
  async handler(request: APIGatewayProxyEventV2 | Request, _: Context) {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);

    const lamDBRequest = isRequest(request) ? request : fromApiGatwayRequest(request);

    return toApiGatewayResponse(await this.service.execute(lamDBRequest, this.endpointType));
  }
}

const readerClass = new ReaderWriterHandler('reader');
const writerClass = new ReaderWriterHandler('writer');

export const readerHandler: Handler = readerClass.handler.bind(readerClass);
export const writerHandler: Handler = writerClass.handler.bind(writerClass);
