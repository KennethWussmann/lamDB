import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Request, requestSchema, Response } from '@lamdb/commons';

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

export const fromApiGatewayResponse = (response: APIGatewayProxyStructuredResultV2): Response => ({
  status: response.statusCode ?? 0,
  body: response.body,
  headers: response.headers
    ? Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key, value.toString()]))
    : {},
});

export const getRequestFromUnion = (request: APIGatewayProxyEventV2 | Request): Request => {
  const result = requestSchema.safeParse(request);
  if (result.success) {
    return result.data;
  } else {
    return fromApiGatwayRequest(request as APIGatewayProxyEventV2);
  }
};

export const isRequest = (request: APIGatewayProxyEventV2 | Request): request is Request =>
  !!(request as Request)?.method;
