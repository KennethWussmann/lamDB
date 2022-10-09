import { optimizeDocuments } from '@graphql-tools/relay-operation-optimizer';
import { GraphQLSchema, parse, print } from 'graphql';
import { Response } from '../../requestResponse';
import { MiddlewareContext, MiddlewareNextFunction, QueryEngineProxyMiddleware } from './middleware';

const optimize = (schema: GraphQLSchema, document: string) => {
  const parsedDocument = JSON.parse(document);
  return JSON.stringify({
    operationName: parsedDocument.operationName,
    variables: parsedDocument.variables,
    query: print(
      optimizeDocuments(
        schema,
        [
          parse(parsedDocument.query, {
            noLocation: true,
          }),
        ],
        {
          includeFragments: false,
          assumeValid: true,
          noLocation: true,
        },
      )[0],
    ),
  });
};

export const optimizeOperation: QueryEngineProxyMiddleware = async (
  context: MiddlewareContext,
  next: MiddlewareNextFunction,
): Promise<Response> => {
  if (context.request.method.toLowerCase() !== 'post' || !context.request.body) {
    // skip middleware if not graphql or body empty
    return next(context);
  }

  return next({
    ...context,
    request: {
      ...context.request,
      body: optimize(await context.queryEngine.getSchema(), context.request.body),
    },
  });
};
