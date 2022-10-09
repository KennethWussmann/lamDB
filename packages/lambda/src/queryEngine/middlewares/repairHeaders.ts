import { MiddlewareContext, MiddlewareNextFunction, QueryEngineProxyMiddleware } from './middleware';

export const repairHeaders: QueryEngineProxyMiddleware = (context: MiddlewareContext, next: MiddlewareNextFunction) => {
  const { request } = context;
  return next({
    ...context,
    request: {
      ...request,
      headers: {
        ...request.headers,
        'content-type': !request.headers?.['content-type'] ? 'application/json' : request.headers['content-type'],
        accept: !request.headers?.['accept'] ? 'application/json' : request.headers['accept'],
      },
    },
  });
};
