import { Logger } from 'winston';
import { Request, Response } from '../../utils';
import { QueryEngine } from '../queryEngine';

export type MiddlewareContext = {
  request: Request;
  queryEngine: QueryEngine;
  logger: Logger;
};
export type MiddlewareNextFunction = (context: MiddlewareContext) => Promise<Response>;
export type QueryEngineProxyMiddleware = (
  context: MiddlewareContext,
  next: MiddlewareNextFunction,
) => Promise<Response> | Response;

export const executeMiddlewares = async (
  context: MiddlewareContext,
  middlewares: QueryEngineProxyMiddleware[],
  execute: (context: MiddlewareContext) => Promise<Response>,
): Promise<Response> => {
  const exec = async (context: MiddlewareContext, middlewares: QueryEngineProxyMiddleware[]): Promise<Response> => {
    if (!middlewares.length) {
      return await execute(context);
    }
    const middleware = middlewares[0];
    const response = await middleware(context, async (ctx) => await exec(ctx, middlewares.slice(1)));
    return response;
  };

  if (middlewares.length === 0) {
    return await execute(context);
  }

  return await exec(context, middlewares);
};

export interface Middleware {
  handle: QueryEngineProxyMiddleware;
}
