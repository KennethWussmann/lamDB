import { Logger } from 'winston';
import { Request, Response } from '../../requestResponse';
import { QueryEngine } from '../queryEngine';

export type MiddlewareContext = {
  request: Request;
  queryEngine: QueryEngine;
  logger: Logger;
  host: string;
  port: number;
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
  return await exec(context, middlewares);
};
