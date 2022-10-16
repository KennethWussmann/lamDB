import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { access } from 'fs/promises';
import { Request, Response } from './requestResponse';

export const exists = async (file: string) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

export const graphQlErrorResponse = (message: string): Response => ({
  status: 400,
  body: JSON.stringify({
    data: null,
    errors: [
      {
        message,
      },
    ],
  }),
  headers: {
    'content-type': 'application/json',
  },
});

export const toApiGatewayResponse = (response: Response): APIGatewayProxyResultV2 => ({
  statusCode: response.status,
  body: response.body,
  headers: response.headers,
  isBase64Encoded: false,
});

export const fromApiGatwayRequest = (request: APIGatewayProxyEventV2): Request => ({
  path: request.requestContext.http.path,
  method: request.requestContext.http.method,
  headers: Object.fromEntries(Object.entries(request.headers).map(([key, value]) => [key, value ?? ''])),
  body: request.body,
});
