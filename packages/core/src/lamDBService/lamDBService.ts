// This file is somehow not picked up by the coverage reporter
// istanbul ignore file
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
  writeErrorMetric,
  writeLatencyMetric,
  writeMigrationsAppliedMetric,
  metricsEnabled,
  writeDatabaseSizeMetric,
  writeOperationsMetric,
  writeThroughputMetric,
  publishMetrics,
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
  private logger = createLogger({ name: 'LamDBService' });

  constructor(
    config: LamDBConfiguration,
    private queryEngine = getQueryEngine({
      databaseFilePath: config.databasePath,
      libraryPath: config.queryEngineLibraryPath,
      prismaSchemaPath: config.prismaSchemaPath,
      operationOptimization: config.operationOptimization,
    }),
    private migrationEngine = getMigrationEngine({
      binaryPath: config.migrationEngineBinaryPath,
      databaseFilePath: config.databasePath,
      prismaSchemaPath: config.prismaSchemaPath,
    }),
  ) {}

  @tracer.captureMethod({ captureResponse: false })
  async execute(request: Request, endpointType: 'reader' | 'writer' | 'proxy' = 'proxy') {
    const operationInfo = getOperationInfo(request);

    if (operationInfo?.type === 'query' && endpointType === 'writer') {
      this.logger.warn(
        'Executing read operations on the writer endpoint is inefficient. Please use the reader endpoint or proxy instead. Continue execution of query operation.',
      );
    }

    if (operationInfo?.type === 'mutation' && endpointType === 'reader') {
      writeErrorMetric();
      publishMetrics();
      return graphQlErrorResponse('Cannot execute mutations in read-only mode');
    }

    try {
      const oerationType = operationInfo?.type === 'mutation' ? 'write' : 'read';
      const start = new Date().getTime();
      const response = await this.queryEngine.execute(request);
      writeLatencyMetric(oerationType, new Date().getTime() - start);
      if (metricsEnabled) {
        // as this metric requires additional IO, we only want to collect it if metrics are enabled
        writeDatabaseSizeMetric(await this.migrationEngine.getDatabaseSizeBytes());
      }
      writeOperationsMetric(oerationType);
      writeThroughputMetric('read', request.body ? Buffer.byteLength(request.body, 'utf-8') : 0);
      writeThroughputMetric('write', response.body ? Buffer.byteLength(response.body, 'utf-8') : 0);
      publishMetrics();
      return response;
    } catch (e: any) {
      writeErrorMetric();
      publishMetrics();
      this.logger.error('Failed to proxy request', errorLog(e));
      return graphQlErrorResponse(`Failed to proxy request: ${e?.message}`);
    }
  }

  @tracer.captureMethod()
  async migrate() {
    const applied = await this.migrationEngine.apply();
    writeMigrationsAppliedMetric(applied.length);
    publishMetrics();
    return applied;
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
