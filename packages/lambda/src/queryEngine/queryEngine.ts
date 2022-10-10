import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import { buildSchema, GraphQLSchema } from 'graphql';
import { createLogger } from '../logger';
import { Request, Response } from '../requestResponse';
import { executeRequest } from './middlewares/executeRequest';
import { interceptIntrospectionQuery } from './middlewares/interceptIntrospectionQuery';
import { executeMiddlewares } from './middlewares/middleware';
import { optimizeOperation } from './middlewares/optimizeOperation';
import { repairBody } from './middlewares/repairBody';
import { repairHeaders } from './middlewares/repairHeaders';

export type QueryEngineSettings = {
  binaryPath: string;
  prismaSchemaPath: string;
  databaseFilePath: string;
  host?: string;
  port?: number;
  enableMetrics?: boolean;
  enablePlayground?: boolean;
  enableRawQueries?: boolean;
  debug?: boolean;
};

export class QueryEngine {
  private logger = createLogger({ name: 'QueryEngine' });
  private running = false;
  private process: ChildProcessWithoutNullStreams | undefined;
  private awaitingStop = false;
  private ready = false;
  private host = this.settings.host ?? '0.0.0.0';
  private port = this.settings.port ?? 8080;
  private graphQlSchema: GraphQLSchema | undefined;

  constructor(private settings: QueryEngineSettings) {}

  private buildArgs = (): string[] => {
    const args = [
      '--datamodel-path',
      this.settings.prismaSchemaPath,
      '--port',
      `${this.port}`,
      '--host',
      `${this.host}`,
      '--log-queries',
    ];
    if (this.settings.debug) {
      args.push('--debug');
    }
    if (this.settings.enableMetrics) {
      args.push('--enable-metrics');
    }
    if (this.settings.enablePlayground) {
      args.push('--enable-playground');
    }
    if (this.settings.enableRawQueries) {
      args.push('--enable-raw-queries');
    }
    return args;
  };

  /**
   * Check if query engine process is running.
   * May still be unresponsive during init.
   * @returns Wether the query engine process is running.
   */
  isRunning = () => this.running;

  /**
   * Start the query engine subprocess.
   * @param maxRestarts How often the query engine will try to restart once crashed
   * @param startTry First try
   * @returns exit code
   */
  start = (maxRestarts = 3, startTry = 1): Promise<number | undefined> => {
    if (this.running) {
      throw new Error('Query engine already running');
    }
    this.running = true;

    return new Promise((resolve, reject) => {
      this.awaitingStop = false;
      const args = this.buildArgs();
      this.logger.info('Starting query engine', { binary: this.settings.binaryPath, args });
      this.process = spawn(this.settings.binaryPath, args, {
        env: {
          ...process.env,
          DATABASE_URL: `file:${this.settings.databaseFilePath}?pool_timeout=5`,
        },
      });

      this.process.stdout.on('data', (data) => {
        try {
          const logMessage = JSON.parse(data);
          if (!this.ready && logMessage.fields.message === 'Fetched a connection from the pool') {
            this.ready = true;
            this.logger.debug('Query engine is ready to accept connections');
          }
          if (logMessage.fields.message === 'PANIC' && logMessage.fields.reason.includes('Address already in use')) {
            this.logger.log('error', `Query engine cannot start on port ${this.port}`);
          }
          this.logger.info(logMessage);
        } catch {
          this.logger.info('Query engine subprocess', { log: new String(data).trim() });
        }
      });
      this.process.stderr.on('data', (data) => {
        try {
          const logMessage = JSON.parse(data);
          this.logger.log(logMessage?.level?.toLowerCase() ?? 'info', logMessage);
        } catch {
          this.logger.error('Query engine subprocess', { log: new String(data).trim() });
        }
      });
      this.process.on('close', (code) => {
        this.reset();

        if (this.awaitingStop) {
          this.logger.info('Query engine was stopped and exited', { code });
          resolve(code ?? undefined);
        } else {
          if (startTry > maxRestarts) {
            this.logger.error('Failed to restart query engine', { code });
            reject(code ?? undefined);
            return;
          }

          this.logger.error('Query engine has crashed and exited. Attempting restart.', { code, try: startTry });

          this.start(maxRestarts, startTry + 1)
            .then(resolve)
            .catch(reject);
        }
      });
      process.on('SIGINT', this.stop);
      process.on('SIGTERM', this.stop);
    });
  };

  /**
   * Wait until the subprocess is ready to receive requests
   * @returns When the subprocess is ready
   */
  awaitReady = (): Promise<void> => {
    return new Promise((resolve) => {
      const interval = setInterval(() => {
        if (this.ready) {
          resolve();
          clearInterval(interval);
        }
      }, 10);
    });
  };

  /**
   * Start query engine if not running and wait until it's ready to receive requests
   */
  initialize = async (
    onStop: (exitCode: number | undefined) => void = () => {
      // no op
    },
  ) => {
    if (!this.isRunning()) {
      this.logger.info('Starting query engine');
      this.start().then(onStop).catch(onStop);
      await this.awaitReady();
    } else {
      this.logger.info('Query engine is running already');
    }
  };

  /**
   * Reset local state so the query engine can be started again after a stop.
   */
  private reset = () => {
    this.running = false;
    this.ready = false;
    this.graphQlSchema = undefined;
    this.process = undefined;
  };

  /**
   * Reset the local query engine state and stop the subprocess
   */
  stop = () => {
    this.awaitingStop = true;
    this.process?.kill();
    this.reset();
  };

  /**
   * Get the query engine's GraphQL schema.
   * Runs a proxy request to retrieve SDL and builds a [GraphQLSchema] from it.
   * Returns cached values when requested once. Restart query engine to refresh schema.
   * @returns GraphQLSchema
   */
  getSchema = async (): Promise<GraphQLSchema> => {
    if (this.graphQlSchema) {
      return this.graphQlSchema;
    }
    const response = await this.proxy({
      method: 'GET',
      path: '/sdl',
    });
    if (response.status !== 200 || !response.body) {
      throw new Error('Failed to request SDL');
    }
    this.graphQlSchema = buildSchema(response.body);
    return this.graphQlSchema;
  };

  /**
   * Execute a GraphQL Operation or playground / SDL request.
   * @param request GraphQL Request
   * @returns query engine response
   */
  proxy = async (request: Request): Promise<Response> => {
    if (!this.ready) {
      this.logger.debug('Query engine is not ready to accept requests yet. Awaiting for it to become ready.');
      await this.awaitReady();
    }
    return await executeMiddlewares(
      {
        queryEngine: this,
        request,
        host: this.host,
        port: this.port,
        logger: createLogger({ name: 'QueryEngineMiddleware' }),
      },
      [repairBody, repairHeaders, interceptIntrospectionQuery, optimizeOperation],
      executeRequest,
    );
  };
}
