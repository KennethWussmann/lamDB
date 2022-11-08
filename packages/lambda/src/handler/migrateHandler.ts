import { Events, LambdaInterface } from '@aws-lambda-powertools/commons';
import { tracer } from '@lamdb/core';
import { Context } from 'aws-lambda';
import { defaultApplicationContext } from '../applicationContext';

class MigrateHandler implements LambdaInterface {
  @tracer.captureLambdaHandler()
  public async handler(_: typeof Events.Custom.CustomEvent, __: Context): Promise<unknown> {
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);
    const { service } = defaultApplicationContext;
    return { appliedMigrations: await service.migrate() };
  }
}

const handlerClass = new MigrateHandler();
export const migrateHandler = handlerClass.handler;
