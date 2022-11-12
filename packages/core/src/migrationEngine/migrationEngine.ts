import { readFile, rm, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { createLogger, logTraceSync, tracer, errorLog, exists, getDatabaseUrl, sha1Hash } from '../utils';
import execa from 'execa';
import { ApplyMigrationRequest, isRPCError, isRPCMigrationResult, RPCResponse, rpcResponse } from './types';

const logger = createLogger({ name: 'MigrationEngine' });

type MigrationEngineConfig = {
  binaryPath: string;
  prismaSchemaPath: string;
  databaseFilePath: string;
};

export class MigrationEngine {
  private messageId = 0;
  private migrationDone = false;
  private schemaHash: string | undefined;
  private previousSchemaHash: string | undefined;
  private schemaContent: string | undefined;
  private migrationLockFilePath = join(
    dirname(this.config.databaseFilePath),
    `${basename(this.config.databaseFilePath)}.migration.lock`,
  );
  private migrationsPath = join(dirname(this.config.prismaSchemaPath), 'migrations');

  constructor(private config: MigrationEngineConfig) {}

  @tracer.captureMethod({ captureResponse: false })
  private async getSchemaContent() {
    if (this.schemaContent) {
      return this.schemaContent;
    }
    this.schemaContent = await readFile(this.config.prismaSchemaPath, 'utf8');
    return this.schemaContent;
  }

  @tracer.captureMethod()
  private async getSchemaHash() {
    if (this.schemaHash) {
      return this.schemaHash;
    }
    this.schemaHash = sha1Hash(await this.getSchemaContent());
    return this.schemaHash;
  }

  @tracer.captureMethod()
  private async getPreviousSchemaHash() {
    if (this.previousSchemaHash) {
      return this.previousSchemaHash;
    }
    this.previousSchemaHash = await readFile(this.migrationLockFilePath, 'utf8');
    return this.previousSchemaHash;
  }

  @tracer.captureMethod()
  private async requiresMigration() {
    if (this.migrationDone) {
      return false;
    }
    if (!(await exists(this.migrationsPath))) {
      logger.warn('No migrations exist: Database may remain empty.');
      return false;
    }
    if (!(await exists(this.migrationLockFilePath))) {
      return true;
    }
    return (await this.getPreviousSchemaHash()) !== (await this.getSchemaHash());
  }

  @tracer.captureMethod()
  private async updateMigrationLockFile() {
    await writeFile(this.migrationLockFilePath, await this.getSchemaHash(), 'utf8');
  }

  @tracer.captureMethod()
  private async rollbackMigrationLockFile() {
    await writeFile(this.migrationLockFilePath, await this.getPreviousSchemaHash(), 'utf8');
  }

  /**
   * Check if migration is necessary using a lockfile. If lockfile is in sync with current schema, nothing will be applied.
   * If lockfile is out of sync with schema, the schema will be tried to apply using Prisma migration engine. Migration engine might still decide that nothing needs execution.
   * @param force Skip checksum lockfile check and try to apply anyways
   * @returns array of applied migration names
   */
  @tracer.captureMethod()
  async apply(force = false): Promise<string[]> {
    if (!force && !(await this.requiresMigration())) {
      logger.debug('Not running migration: Database already up-to-date');
      return [];
    }
    // optimistically lock the migration, to avoid another parallel migraiton
    await this.updateMigrationLockFile();

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
            this.migrationDone = true;
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
        await this.rollbackMigrationLockFile();
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
      [
        this.config.databaseFilePath,
        this.migrationLockFilePath,
        `${databaseDir}-shm`,
        `${databaseDir}-wal`,
        `${databaseDir}-journal`,
      ].map(async (file) => {
        if (await exists(file)) {
          await rm(file);
        }
      }),
    );
    this.migrationDone = false;
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
