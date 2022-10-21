import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { Request, requestSchema, Response } from '../../core/src/requestResponse';
import { isExecutableDefinitionNode, OperationDefinitionNode, OperationTypeNode, parse } from 'graphql';
import { sha1Hash } from '@lamdb/core';

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

export const getOperationInfo = (
  request: Request,
): { name: string; type: OperationTypeNode; hash: string | undefined } | undefined => {
  if (!request.body) {
    return undefined;
  }

  let parsedDocument;
  try {
    parsedDocument = JSON.parse(request.body);
  } catch {
    return undefined;
  }

  const document = parse(parsedDocument.query, {
    noLocation: true,
  });

  const executableNodes = document.definitions.filter(isExecutableDefinitionNode);

  if (executableNodes.length === 0) {
    throw new Error('Document does not include executable nodes');
  }

  const operationNodes: OperationDefinitionNode[] = executableNodes
    .filter((node: any) => !!node?.operation)
    .map((node) => node as OperationDefinitionNode);

  if (operationNodes.length === 0) {
    throw new Error('Document does not include operation nodes');
  }
  if (operationNodes.length > 1) {
    throw new Error('Document includes multiple operation nodes: Only one is supported');
  }
  return {
    name: parsedDocument.operationName ?? operationNodes[0].name ?? '',
    type: operationNodes[0].operation,
    hash: request.body ? sha1Hash(request.body) : undefined,
  };
};
