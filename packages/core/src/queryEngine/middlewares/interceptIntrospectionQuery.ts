import { getIntrospectionQuery, GraphQLSchema, graphqlSync } from 'graphql';
import { Response } from '../../requestResponse';
import { errorLog } from '../../utils';
import { MiddlewareContext, MiddlewareNextFunction, QueryEngineProxyMiddleware } from './middleware';

const getIntrospectionResponse = (schema: GraphQLSchema): Promise<Response> => {
  const result = graphqlSync({
    schema: schema,
    operationName: 'IntrospectionQuery',
    source: getIntrospectionQuery(),
  });
  return Promise.resolve({
    status: 200,
    body: JSON.stringify(result),
    headers: {
      'content-type': 'application/json',
    },
  });
};

export const interceptIntrospectionQuery: QueryEngineProxyMiddleware = async (
  context: MiddlewareContext,
  next: MiddlewareNextFunction,
) => {
  const { request } = context;
  if (request.method.toLowerCase() === 'post') {
    try {
      if (JSON.parse(request.body ?? '{}').operationName === 'IntrospectionQuery') {
        // don't proxy introspection queries, do it locally because introspection queries are not well supported by query engine
        context.logger.debug('Intercepting introspection query and returning locally');
        return getIntrospectionResponse(await context.queryEngine.getSchema());
      }
    } catch (e: any) {
      context.logger.error('Failed to parse request body json', { request, error: errorLog(e) });
    }
  }
  return next(context);
};
