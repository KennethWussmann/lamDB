// istanbul ignore file
import { LamDBConfiguration, LamDBService } from '@lamdb/core';
import { logTraceSync, tracer } from '@lamdb/commons';
import { DeferredService } from './handler/deferredService';
import { DynamoDB } from '@aws-sdk/client-dynamodb';

class ApplicationContext {
  configuration = new LamDBConfiguration();
  lamDbService = new LamDBService(this.configuration);
  deferredService = new DeferredService(this.lamDbService, tracer.captureAWSv3Client(new DynamoDB({})));
}

export const defaultApplicationContext = logTraceSync({
  segmentName: 'ApplicationContext.init',
  method: () => new ApplicationContext(),
});
