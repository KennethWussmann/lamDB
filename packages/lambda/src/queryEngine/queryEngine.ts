import { buildSchema, GraphQLSchema } from 'graphql';
import { ChildProcessMonitor } from '../childProcessMonitor';
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
  private host = this.settings.host ?? '0.0.0.0';
  private port = this.settings.port ?? 8080;
  private graphQlSchema: GraphQLSchema | undefined;
  private process: ChildProcessMonitor = new ChildProcessMonitor(
    'QueryEngine',
    this.settings.binaryPath,
    (() => {
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
    })(),
    {
      DATABASE_URL: `file:${this.settings.databaseFilePath}?pool_timeout=5`,
    },
    true,
    (_, message: string) => message.includes('Fetched a connection from the pool'),
    (level: string, message: string) => {
      try {
        const parsedMessage = JSON.stringify(message);
        return [level, parsedMessage];
      } catch {
        return [level, message];
      }
    },
  );

  constructor(private settings: QueryEngineSettings) {}

  /**
   * Start query engine if not running and wait until it's ready to receive requests
   */
  initialize = async (
    onStop: (exitCode: number | undefined) => void = () => {
      // no op
    },
  ) =>
    await this.process.initialize((exitCode) => {
      this.graphQlSchema = undefined;
      onStop(exitCode);
    });

  /**
   * Reset the local query engine state and stop the subprocess
   */
  stop = this.process.stop;

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
    if (!this.process.isReady()) {
      this.logger.debug('Query engine is not ready to accept requests yet. Awaiting for it to become ready.');
      await this.process.awaitReady();
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
