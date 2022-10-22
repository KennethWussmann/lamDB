import { LibraryEngine } from '@prisma/engine-core';
import { Library, QueryEngineInstance } from '@prisma/engine-core/dist/library/types/Library';
import { buildSchema, GraphQLSchema } from 'graphql';
import { createLogger } from '../logger';
import { Request, Response } from '../requestResponse';
import { getDatabaseUrl } from '../utils';
import { interceptIntrospectionQuery } from './middlewares/interceptIntrospectionQuery';
import { executeMiddlewares, MiddlewareContext } from './middlewares/middleware';
import { optimizeOperation } from './middlewares/optimizeOperation';

export type QueryEngineSettings = {
  libraryPath: string;
  prismaSchemaPath: string;
  databaseFilePath: string;
};

export class QueryEngine {
  private logger = createLogger({ name: 'QueryEngine' });
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
        loadLibrary: () => Promise.resolve(eval('require')(this.settings.libraryPath) as Library),
      },
    );
  }

  getSdl = async (): Promise<string> => {
    await this.engine.start();
    return await ((this.engine as any).engine as QueryEngineInstance).sdlSchema();
  };

  getSchema = async (): Promise<GraphQLSchema> => {
    if (this.graphQlSchema) {
      return this.graphQlSchema;
    }
    await this.engine.start();

    // hack to access the private QueryEngineInstance engine prop inside LibraryEngine
    this.graphQlSchema = buildSchema(await this.getSdl());
    return this.graphQlSchema;
  };

  execute = async (request: Request): Promise<Response> => {
    return await executeMiddlewares(
      {
        queryEngine: this,
        request,
        logger: createLogger({ name: 'QueryEngineMiddleware' }),
      },
      [interceptIntrospectionQuery, optimizeOperation],
      async (context: MiddlewareContext): Promise<Response> => {
        const query = JSON.parse(context.request.body ?? '{}').query;
        this.logger.debug('Executing query', { query });
        const res = await this.engine.request(query);
        const response = {
          headers: {
            'content-type': 'application/json',
          },
          status: 200,
          body: JSON.stringify(res.data),
        };
        return response;
      },
    );
  };
}
let queryEngine: QueryEngine | undefined;

export const getQueryEngine = (config: QueryEngineSettings): QueryEngine => {
  if (queryEngine) {
    return queryEngine;
  }
  queryEngine = new QueryEngine(config);
  return queryEngine;
};
