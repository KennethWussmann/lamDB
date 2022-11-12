import { Request, Response } from '@lamdb/core';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

export const fromExpressRequest = (expressRequest: ExpressRequest): Request => ({
  method: expressRequest.method,
  body: JSON.stringify(expressRequest.body),
  headers: Object.fromEntries(
    Object.entries(expressRequest.headers).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value ?? '']),
  ),
  path: expressRequest.path,
});

export const applyToExpressResponse = (response: Response, expressResponse: ExpressResponse) => {
  Object.entries(response.headers).forEach(([key, value]) => expressResponse.setHeader(key, value));
  expressResponse.status(response.status);
  expressResponse.send(response.body);
};
