import {
  createLogger,
  errorLog,
  getMigrationEngine,
  getQueryEngine,
  MigrationEngine,
  QueryEngine,
  Request,
} from '@lamdb/core';
import { LamDBConfiguration } from './configuration';
import { getOperationInfo, graphQlErrorResponse } from './utils';

export type LamDBServiceConfig = {
  queryEngine: QueryEngine;
  migrationEngine: MigrationEngine;
};

export class LamDBService {
  private queryEngine: QueryEngine;
  private migrationEngine: MigrationEngine;
  private logger = createLogger({ name: 'LamDBService' });

  constructor(private config: LamDBConfiguration) {
    this.queryEngine = getQueryEngine({
      databaseFilePath: config.databasePath,
      libraryPath: config.queryEngineLibraryPath,
      prismaSchemaPath: config.prismaSchemaPath,
    });
    this.migrationEngine = getMigrationEngine({
      binaryPath: config.migrationEngineBinaryPath,
      databaseFilePath: config.databasePath,
      prismaSchemaPath: config.prismaSchemaPath,
    });
  }

  execute = async (request: Request, endpointType: 'reader' | 'writer' | 'proxy' = 'proxy') => {
    const operationInfo = getOperationInfo(request);

    if (operationInfo?.type === 'query' && endpointType === 'writer') {
      this.logger.warn(
        'Executing read operations on the writer endpoint is inefficient. Please use the reader endpoint or proxy instead. Continue execution of query operation.',
      );
    }

    if (operationInfo?.type === 'mutation' && endpointType === 'reader') {
      return graphQlErrorResponse('Cannot execute mutations in read-only mode');
    }

    try {
      const response = await this.queryEngine.execute(request);

      return response;
    } catch (e: any) {
      this.logger.error('Failed to proxy request', errorLog(e));
      return graphQlErrorResponse(`Failed to proxy request: ${e?.message}`);
    }
  };

  migrate = async (force: boolean = this.config.migrationEngineForceMigration) =>
    await this.migrationEngine.apply(force);
}

let lamDBService: LamDBService | undefined;

export const getLamDBService = (config: LamDBConfiguration): LamDBService => {
  if (lamDBService) {
    return lamDBService;
  }
  lamDBService = new LamDBService(config);
  return lamDBService;
};
