import { LambdaInterface } from '@aws-lambda-powertools/commons';
import { createLogger, tracer } from '@lamdb/commons';
import { Context } from 'aws-lambda';
import { defaultApplicationContext } from '../applicationContext';

const logger = createLogger({ name: 'MigrateHandler' });

type MigrationEvent = {
  force?: boolean;
  reset?: boolean;
  migrate?: boolean;
};

class MigrateHandler implements LambdaInterface {
  @tracer.captureLambdaHandler()
  public async handler({ force = false, reset = false, migrate = true }: MigrationEvent = {}, _: Context): Promise<unknown> {
    tracer.annotateColdStart();
    tracer.getSegment().addMetadata('initType', process.env.AWS_LAMBDA_INITIALIZATION_TYPE);
    const { service } = defaultApplicationContext;

    if (reset) {
      logger.warn('The database will be deleted.');
      await service.reset();
    }

    const appliedMigrations = migrate ? await service.migrate(force) : undefined;
    return { appliedMigrations, reset, migrate, force };
  }
}

const handlerClass = new MigrateHandler();
export const migrateHandler = handlerClass.handler;
