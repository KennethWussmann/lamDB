import { rm, stat } from 'fs/promises';
import { dirname, join } from 'path';
import { createLogger, logTraceSync, tracer, errorLog, exists } from '@lamdb/commons';
import execa from 'execa';
import { ApplyMigrationRequest, isRPCError, isRPCMigrationResult, RPCResponse, rpcResponse } from './types';
import { getDatabaseUrl } from '../utils';

const logger = createLogger({ name: 'MigrationEngine' });

type MigrationEngineConfig = {
  binaryPath: string;
  prismaSchemaPath: string;
  databaseFilePath: string;
};

export class MigrationEngine {
  private messageId = 0;
  private schemaHash: string | undefined;
  private migrationsPath = join(dirname(this.config.prismaSchemaPath), 'migrations');

  constructor(private config: MigrationEngineConfig) {}

  /**
   * Execute migrations if needed using MigrationEngine
   * @returns array of applied migration names
   */
  @tracer.captureMethod()
  async apply(): Promise<string[]> {
    logger.info('Executing migration', { schemaHash: this.schemaHash });
    let appliedMigrationNames: string[] | undefined;
    let migration: execa.ExecaChildProcess<string> | undefined;
    try {
      // Not using @prisma/migrate here because the published package is broken a lot and not accessible in a typesafe way.
      // Also it requires WASM dependencies where the path couldn't be specified.
      migration = execa(this.config.binaryPath, ['--datamodel', this.config.prismaSchemaPath], {
        env: {
          ...process.env,
          DATABASE_URL: getDatabaseUrl(this.config.databaseFilePath),
          RUST_LOG: process.env.LOG_LEVEL ?? 'info',
        },
      });
      const migrationRequest: ApplyMigrationRequest = {
        id: this.messageId++,
        jsonrpc: '2.0',
        method: 'applyMigrations',
        params: {
          migrationsDirectoryPath: this.migrationsPath,
        },
      };
      logger.debug('Executing migration egnine RPC request', { request: migrationRequest });
      migration.stdin?.write(`${JSON.stringify(migrationRequest)}\n`);

      migration.stdout?.on('data', (chunk) => {
        const responseString = Buffer.from(chunk).toString();
        try {
          logger.debug('Received migration response', { responseString });
          const response: RPCResponse = rpcResponse.parse(JSON.parse(responseString));

          if (isRPCError(response)) {
            logger.error(response.error.data.message, {
              code: response.error.code,
              error_code: response.error.data.error_code,
            });
            migration?.kill(1);
            return;
          }
          if (isRPCMigrationResult(response)) {
            appliedMigrationNames = response.result.appliedMigrationNames;
            if (!appliedMigrationNames || appliedMigrationNames.length === 0) {
              logger.info('No migration scripts required execution');
            } else {
              logger.info(
                `Executed ${appliedMigrationNames.length} migration${appliedMigrationNames.length !== 1 ? 's' : ''}`,
                { appliedMigrationNames },
              );
            }
            migration?.kill('SIGTERM');
            return;
          }
          if (response.method === 'print') {
            logger.info(response.params.content);
            // ACK message, very important, engine will wait for it
            migration?.stdin?.write(
              `${JSON.stringify({
                id: response.id,
                jsonrpc: '2.0',
                result: {},
              })}\n`,
            );
            return;
          }
        } catch (e) {
          logger.error('Received invalid migration response', { error: errorLog(e), response: responseString });
          migration?.kill(1);
        }
      });

      await migration;
    } catch (e: any) {
      // ignore a graceful SIGTERM stop, all good
      if (e?.signal !== 'SIGTERM') {
        logger.error('Failed to apply migrations', errorLog(e));
        throw new Error('Failed to apply migrations');
      }
    } finally {
      migration?.kill();
    }
    return appliedMigrationNames ?? [];
  }

  /**
   * Caution: Will delete the entire database files.
   * Reset the EFS to a clean state.
   */
  @tracer.captureMethod()
  async reset() {
    const databaseDir = dirname(this.config.databaseFilePath);
    await Promise.all(
      [this.config.databaseFilePath, `${databaseDir}-shm`, `${databaseDir}-wal`, `${databaseDir}-journal`].map(
        async (file) => {
          if (await exists(file)) {
            await rm(file);
          }
        },
      ),
    );
  }

  /**
   * Get current database file size in bytes.
   */
  @tracer.captureMethod()
  async getDatabaseSizeBytes(): Promise<number> {
    const { size } = await stat(this.config.databaseFilePath);
    return size;
  }
}

let migrationEngine: MigrationEngine | undefined;

export const getMigrationEngine = (config: MigrationEngineConfig): MigrationEngine =>
  logTraceSync({
    logger,
    segmentName: 'getMigrationEngine',
    metadata: { firstInit: !!migrationEngine },
    method: () => {
      if (migrationEngine) {
        return migrationEngine;
      }
      migrationEngine = new MigrationEngine(config);
      return migrationEngine;
    },
  });
