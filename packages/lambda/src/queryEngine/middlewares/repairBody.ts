import { MiddlewareContext, MiddlewareNextFunction, QueryEngineProxyMiddleware } from './middleware';

export const repairBody: QueryEngineProxyMiddleware = (context: MiddlewareContext, next: MiddlewareNextFunction) => {
  const { request } = context;
  try {
    const bodyParsed = JSON.parse(request.body ?? '{}');

    if (bodyParsed?.query) {
      // query engine requires operationName & variables in request
      return next({
        ...context,
        request: {
          ...request,
          body: JSON.stringify({
            operationName: !bodyParsed?.operationName ? '' : bodyParsed?.operationName,
            query: bodyParsed.query,
            variables: bodyParsed?.variables ?? {},
          }),
        },
      });
    }
  } catch {
    // ignore if we cannot parse the JSON
  }
  return next(context);
};
