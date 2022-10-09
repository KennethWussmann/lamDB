import fetch from 'node-fetch';
import { Response } from '../../requestResponse';
import { MiddlewareContext } from './middleware';

export const executeRequest = async (context: MiddlewareContext): Promise<Response> => {
  const { request, logger } = context;
  const url = `http://${context.host}:${context.port}${request.path ?? '/'}`;
  const res = await fetch(url, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });
  const response = {
    headers: Object.fromEntries(res.headers),
    status: res.status,
    body: await res.text(),
  };
  logger.debug('Executed proxy request', { request, response });
  return response;
};
