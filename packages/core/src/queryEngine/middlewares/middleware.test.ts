import { testQuery } from '../../../test/testOperation';
import { getTestQueryEngine } from '../../../test/testQueryEngine';
import { operationToRequest } from '../../../test/utils';
import { Response, createLogger } from '@lamdb/commons';
import { executeMiddlewares, MiddlewareContext, QueryEngineProxyMiddleware } from './middleware';

let context: MiddlewareContext;

describe('middleware', () => {
  beforeEach(() => {
    context = {
      queryEngine: getTestQueryEngine(),
      logger: createLogger({ name: 'test' }),
      request: operationToRequest(testQuery),
    };
  });

  it('executes middlewares in order', async () => {
    const end = (context: MiddlewareContext): Promise<Response> =>
      Promise.resolve({
        status: 201,
        body: `Test Body for request ${context.request.method} ${context.request.path}`,
        headers: {
          'content-type': 'application/json',
        },
      });
    const middlewareOne: QueryEngineProxyMiddleware = (context, next) =>
      next({
        ...context,
        request: {
          ...context.request,
          path: '/test',
        },
      });
    const middlewareTwo: QueryEngineProxyMiddleware = (context, next) =>
      next({
        ...context,
        request: {
          ...context.request,
          path: `${context.request.path}/two`,
        },
      });

    const response = await executeMiddlewares(context, [middlewareOne, middlewareTwo], end);

    expect(response).toMatchSnapshot();
  });
});
