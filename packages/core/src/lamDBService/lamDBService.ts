import { getMigrationEngine, MigrationEngine } from '../migrationEngine';
import { getQueryEngine, QueryEngine } from '../queryEngine';
import {
  getOperationInfo,
  createLogger,
  errorLog,
  logTraceSync,
  Request,
  tracer,
  graphQlErrorResponse,
} from '@lamdb/commons';
import { LamDBConfiguration } from '../utils';

export type LamDBServiceConfig = {
  queryEngine: QueryEngine;
  migrationEngine: MigrationEngine;
};

/**
 * Service that offers an opinionated interface to the Query- and MigrationEngine.
 */
export class LamDBService {
  private queryEngine: QueryEngine;
  private migrationEngine: MigrationEngine;
  private logger = createLogger({ name: 'LamDBService' });

  constructor(private config: LamDBConfiguration) {
    this.queryEngine = getQueryEngine({
      databaseFilePath: config.databasePath,
      libraryPath: config.queryEngineLibraryPath,
      prismaSchemaPath: config.prismaSchemaPath,
      operationOptimization: config.operationOptimization,
    });
    this.migrationEngine = getMigrationEngine({
      binaryPath: config.migrationEngineBinaryPath,
      databaseFilePath: config.databasePath,
      prismaSchemaPath: config.prismaSchemaPath,
    });
  }

  @tracer.captureMethod({ captureResponse: false })
  async execute(request: Request, endpointType: 'reader' | 'writer' | 'proxy' = 'proxy') {
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
  }

  @tracer.captureMethod()
  async migrate(force: boolean = this.config.migrationEngineForceMigration) {
    return await this.migrationEngine.apply(force);
  }

  /**
   * Caution: Will delete the entire database files.
   * Reset the EFS to a clean state.
   */
  @tracer.captureMethod()
  async reset() {
    await this.migrationEngine.reset();
  }
}

let lamDBService: LamDBService | undefined;

export const getLamDBService = (config: LamDBConfiguration): LamDBService =>
  logTraceSync({
    segmentName: 'getLamDBService',
    metadata: { firstInit: !!lamDBService },
    method: () => {
      if (lamDBService) {
        return lamDBService;
      }
      lamDBService = new LamDBService(config);
      return lamDBService;
    },
  });
