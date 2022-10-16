import { isExecutableDefinitionNode, OperationTypeNode, parse, OperationDefinitionNode } from 'graphql';
import fetch from 'node-fetch';
import { Request, Response } from './requestResponse';
import { graphQlErrorResponse } from './utils';

const getOperationType = (request: Request): OperationTypeNode | undefined => {
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

  const operationNode = operationNodes[0];

  return operationNode.operation;
};

export const executeRequest = async (
  url: string,
  request: Request,
  retry: boolean,
  retryAttempts = 3,
): Promise<Response> => {
  if (retryAttempts <= 0) {
    throw new Error('Request failed: Max retry attempts reached');
  }

  const response = await fetch(url, {
    method: request.method,
    headers: request.headers,
  });

  // retry when service unavailable
  if (response.status === 503 && retry) {
    return await executeRequest(url, request, retry, retryAttempts - 1);
  }

  return {
    status: response.status,
    headers: Object.fromEntries(response.headers),
    body: await response.text(),
  };
};

export const routeQuery = async (
  request: Request,
  baseUrl: string,
  writerEndpoint = 'writer',
  readerEndpoint = 'reader',
): Promise<Response> => {
  try {
    const operationType = getOperationType(request);

    if (!operationType) {
      return graphQlErrorResponse(`Failed to route request: Could not determine GraphQL operation type`);
    }

    if (operationType !== 'mutation' && operationType !== 'query') {
      return graphQlErrorResponse(`Failed to route request: Unsupported operation type '${operationType}'`);
    }

    return await executeRequest(
      `${baseUrl}${operationType === 'mutation' ? writerEndpoint : readerEndpoint}`,
      request,
      operationType === 'mutation',
    );
  } catch (e: any) {
    return graphQlErrorResponse(`Failed to route request: ${e.message}`);
  }
};
