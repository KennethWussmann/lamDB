import { readFile, writeFile } from 'fs/promises';
import { basename, dirname, join } from 'path';
import { createLogger } from '../logger';
import { errorLog, exists, getDatabaseUrl, sha1Hash } from '../utils';
import execa from 'execa';
import { MigrationRequest, MigrationResponse } from './types';

type MigrationEngineConfig = {
  binaryPath: string;
  prismaSchemaPath: string;
  databaseFilePath: string;
};

export class MigrationEngine {
  private logger = createLogger({ name: 'MigrationEngine' });
  private migrationDone = false;
  private schemaHash: string | undefined;
  private previousSchemaHash: string | undefined;
  private schemaContent: string | undefined;
  private migrationLockFilePath = join(
    dirname(this.config.databaseFilePath),
    `${basename(this.config.databaseFilePath)}.migration.lock`,
  );

  constructor(private config: MigrationEngineConfig) {}

  private getSchemaContent = async () => {
    if (this.schemaContent) {
      return this.schemaContent;
    }
    this.schemaContent = await readFile(this.config.prismaSchemaPath, 'utf8');
    return this.schemaContent;
  };

  private getSchemaHash = async () => {
    if (this.schemaHash) {
      return this.schemaHash;
    }
    this.schemaHash = sha1Hash(await this.getSchemaContent());
    return this.schemaHash;
  };

  private getPreviousSchemaHash = async () => {
    if (this.previousSchemaHash) {
      return this.previousSchemaHash;
    }
    this.previousSchemaHash = await readFile(this.migrationLockFilePath, 'utf8');
    return this.previousSchemaHash;
  };

  private requiresMigration = async () => {
    if (this.migrationDone) {
      return false;
    }
    if (!(await exists(this.migrationLockFilePath))) {
      return true;
    }
    return (await this.getPreviousSchemaHash()) !== (await this.getSchemaHash());
  };

  private updateMigrationLockFile = async () => {
    await writeFile(this.migrationLockFilePath, await this.getSchemaHash(), 'utf8');
  };

  private rollbackMigrationLockFile = async () => {
    await writeFile(this.migrationLockFilePath, await this.getPreviousSchemaHash(), 'utf8');
  };

  /**
   * Check if migration is necessary using a lockfile. If lockfile is in sync with current schema, nothing will be applied.
   * If lockfile is out of sync with schema, the schema will be tried to apply using Prisma migration engine. Migration engine might still decide that nothing needs execution.
   * @param force Skip checksum lockfile check and try to apply anyways
   * @returns
   */
  apply = async (force = false) => {
    if (!force && !(await this.requiresMigration())) {
      this.logger.debug('Not running migration: Database already up-to-date');
      return;
    }
    // optimistically lock the migration, to avoid another parallel migraiton
    await this.updateMigrationLockFile();

    this.logger.info('Executing migration', { schemaHash: this.schemaHash });

    let migration: execa.ExecaChildProcess<string> | undefined;
    try {
      // Not using @prisma/migrate here because the published package is broken a lot and not accessible in a typesafe way.
      // Also it requires WASM dependencies where the path couldn't be specified.
      migration = execa(this.config.binaryPath, ['--datamodel', this.config.prismaSchemaPath], {
        env: {
          ...process.env,
          DATABASE_URL: getDatabaseUrl(this.config.databaseFilePath),
        },
      });
      const migrationRequest: MigrationRequest = {
        id: 1,
        jsonrpc: '2.0',
        method: 'schemaPush',
        params: {
          force: true,
          schema: await readFile(this.config.prismaSchemaPath, 'utf8'),
        },
      };
      migration.stdin?.write(`${JSON.stringify(migrationRequest)}\n`);
      migration.stdin?.end();

      migration.stdout?.on('data', (chunk) => {
        const responseString = Buffer.from(chunk).toString();
        try {
          const response: MigrationResponse = JSON.parse(responseString);
          this.logger.debug('Received migration response', { response });
          if (response.result?.executedSteps === 0) {
            this.logger.info('No migration scripts required execution');
          } else {
            this.logger.info(`Executed ${response.result?.executedSteps ?? 0} migrations`);
          }
          this.migrationDone = true;
          migration?.kill('SIGTERM');
        } catch (e) {
          this.logger.error('Received invalid migration response', { error: errorLog(e), response: responseString });
          migration?.kill(1);
        }
      });

      await migration;
    } catch (e: any) {
      // ignore a graceful SIGTERM stop, all good
      if (e?.signal !== 'SIGTERM') {
        await this.rollbackMigrationLockFile();
        this.logger.error('Failed to apply migrations', errorLog(e));
      }
    } finally {
      migration?.kill();
    }
  };
}

let migrationEngine: MigrationEngine | undefined;

export const getMigrationEngine = (config: MigrationEngineConfig): MigrationEngine => {
  if (migrationEngine) {
    return migrationEngine;
  }
  migrationEngine = new MigrationEngine(config);
  return migrationEngine;
};
