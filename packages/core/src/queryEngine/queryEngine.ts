import { LibraryEngine } from '@prisma/engine-core';
import { Library, QueryEngineInstance } from '@prisma/engine-core/dist/library/types/Library';
import { buildSchema, GraphQLSchema } from 'graphql';
import { createLogger } from '../logger';
import { Request, Response } from '../requestResponse';
import { logTraceSync, tracer } from '../tracer';
import { errorLog, exists, getDatabaseUrl } from '../utils';
import { interceptIntrospectionQuery } from './middlewares/interceptIntrospectionQuery';
import { executeMiddlewares, MiddlewareContext } from './middlewares/middleware';
import { optimizeOperation } from './middlewares/optimizeOperation';

const logger = createLogger({ name: 'QueryEngine' });
export type QueryEngineSettings = {
  libraryPath: string;
  prismaSchemaPath: string;
  databaseFilePath: string;
  disableOperationOptimization?: boolean;
};

export class QueryEngine {
  private graphQlSchema: GraphQLSchema | undefined;
  private engine: LibraryEngine;

  constructor(private settings: QueryEngineSettings) {
    const databaseUrl = getDatabaseUrl(this.settings.databaseFilePath);
    // necessary fix, because prisma does not inherit the env config given below, see https://github.com/prisma/prisma/blob/96e7bcd82f7eb80d484aa174a697b0a037258d30/packages/engine-core/src/library/LibraryEngine.ts#L224
    process.env.DATABASE_URL = databaseUrl;
    this.engine = new LibraryEngine(
      {
        datamodelPath: this.settings.prismaSchemaPath,
        env: {
          ...Object.fromEntries(Object.entries(process.env).map(([key, value]) => [key, value ?? ''])),
          DATABASE_URL: databaseUrl,
        },
        tracingConfig: {
          enabled: false,
          middleware: false,
        },
        cwd: __dirname,
      },
      {
        loadLibrary: async () => {
          const { libraryPath } = this.settings;
          if (!(await exists(libraryPath))) {
            logger.error('Failed to load query engine node library. Library does not exist at given path', {
              libraryPath,
            });
            throw new Error(`Library does not exist: ${libraryPath}`);
          }
          return eval('require')(libraryPath) as Library;
        },
      },
    );
  }

  @tracer.captureMethod()
  private async startEngine() {
    await this.engine.start();
  }

  @tracer.captureMethod({ captureResponse: false })
  async getSdl(): Promise<string> {
    await this.startEngine();
    return await ((this.engine as any).engine as QueryEngineInstance).sdlSchema();
  }

  @tracer.captureMethod({ captureResponse: false })
  async getSchema(): Promise<GraphQLSchema> {
    if (this.graphQlSchema) {
      return this.graphQlSchema;
    }
    await this.startEngine();

    // hack to access the private QueryEngineInstance engine prop inside LibraryEngine
    this.graphQlSchema = buildSchema(await this.getSdl());
    return this.graphQlSchema;
  }

  @tracer.captureMethod({ captureResponse: false })
  private async executeRequest(context: MiddlewareContext): Promise<Response> {
    try {
      const operation = JSON.parse(context.request.body ?? '{}');
      const query = operation.query;
      logger.debug('Executing operation', { operation });
      const res = await this.engine.request(query);
      const response = {
        headers: {
          'content-type': 'application/json',
        },
        status: 200,
        body: JSON.stringify(res.data),
      };

      return response;
    } catch (e) {
      logger.error('Failed to execute engine request', { ...errorLog(e), request: context.request });
      throw e;
    }
  }

  @tracer.captureMethod({ captureResponse: false })
  async execute(request: Request): Promise<Response> {
    logger.debug('Handling request', {
      request,
      operationOptimization: !this.settings.disableOperationOptimization,
    });
    tracer.getSegment().addMetadata('operationOptimization', !this.settings.disableOperationOptimization);
    return await executeMiddlewares(
      {
        queryEngine: this,
        request,
        logger: createLogger({ name: 'QueryEngineMiddleware' }),
      },
      this.settings.disableOperationOptimization
        ? [interceptIntrospectionQuery]
        : [interceptIntrospectionQuery, optimizeOperation],
      this.executeRequest.bind(this),
    );
  }
}
let queryEngine: QueryEngine | undefined;

export const getQueryEngine = (config: QueryEngineSettings): QueryEngine =>
  logTraceSync({
    logger,
    segmentName: 'getQueryEngine',
    metadata: { firstInit: !!queryEngine },
    method: () => {
      if (queryEngine) {
        return queryEngine;
      }
      queryEngine = new QueryEngine(config);
      return queryEngine;
    },
  });
