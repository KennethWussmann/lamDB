import { LambdaInterface } from '@aws-lambda-powertools/commons';
import { createLogger, tracer } from '@lamdb/commons';
import { LamDBService } from '@lamdb/core';
import { Context } from 'aws-lambda';
import { defaultApplicationContext } from '../applicationContext';

const logger = createLogger({ name: 'MigrateHandler' });

type MigrationEvent = {
  force?: boolean;
  reset?: boolean;
  migrate?: boolean;
};

export class MigrateHandler implements LambdaInterface {
  constructor(private service: LamDBService = defaultApplicationContext.service) {}

  @tracer.captureLambdaHandler()
  public async handler(
    { force = false, reset = false, migrate = true }: MigrationEvent = {},
    _: Context,
  ): Promise<unknown> {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);

    if (reset) {
      logger.warn('The database will be deleted.');
      await this.service.reset();
    }

    const appliedMigrations = migrate ? await this.service.migrate(force) : undefined;
    return { appliedMigrations, reset, migrate, force };
  }
}

const handlerClass = new MigrateHandler();
export const migrateHandler = handlerClass.handler.bind(handlerClass);
