import { isExecutableDefinitionNode, OperationDefinitionNode, OperationTypeNode, parse } from 'graphql';
import { Request, Response, sha1Hash } from '@lamdb/core';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';

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

export const fromExpressRequest = (expressRequest: ExpressRequest): Request => ({
  method: expressRequest.method,
  body: expressRequest.body,
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
