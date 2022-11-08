import { getIntrospectionQuery, GraphQLSchema, graphqlSync } from 'graphql';
import { Response } from '../../requestResponse';
import { tracer } from '../../tracer';
import { errorLog } from '../../utils';
import { Middleware, MiddlewareContext, MiddlewareNextFunction } from './middleware';

class InterceptIntrospectionQueryMiddleware implements Middleware {
  @tracer.captureMethod({
    subSegmentName: '### InterceptIntrospectionQueryMiddleware.getIntrospectionResponse',
    captureResponse: false,
  })
  private getIntrospectionResponse(schema: GraphQLSchema): Promise<Response> {
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
  }

  @tracer.captureMethod({ subSegmentName: '### InterceptIntrospectionQueryMiddleware.handle', captureResponse: false })
  async handle(context: MiddlewareContext, next: MiddlewareNextFunction): Promise<Response> {
    const { request } = context;
    if (request.method.toLowerCase() === 'post') {
      try {
        if (JSON.parse(request.body ?? '{}').operationName === 'IntrospectionQuery') {
          // don't proxy introspection queries, do it locally because introspection queries are not well supported by query engine
          context.logger.debug('Intercepting introspection query and returning locally');
          return this.getIntrospectionResponse(await context.queryEngine.getSchema());
        }
      } catch (e: any) {
        context.logger.error('Failed to parse request body json', { request, error: errorLog(e) });
      }
    }
    return next(context);
  }
}

const middlewareClass = new InterceptIntrospectionQueryMiddleware();
export const interceptIntrospectionQuery = middlewareClass.handle.bind(middlewareClass);
