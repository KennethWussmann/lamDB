import { Context, DynamoDBStreamEvent, Handler } from 'aws-lambda';
import { tracer } from '@lamdb/commons';
import { defaultApplicationContext } from '../applicationContext';
import { DeferredService } from './deferredService';

export class DynamoDBStreamHandler {
  constructor(private service: DeferredService = defaultApplicationContext.deferredService) {}

  @tracer.captureLambdaHandler({ captureResponse: false })
  async handler(event: DynamoDBStreamEvent, _: Context) {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);

    await this.service.handleRecords(event.Records);
  }
}

const handlerClass = new DynamoDBStreamHandler();
export const dynamoDbStreamHandler: Handler = handlerClass.handler.bind(handlerClass);
