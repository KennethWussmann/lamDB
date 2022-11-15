import { createHash } from 'crypto';
import { access } from 'fs/promises';
import { Request, Response } from './requestResponse';
import { isExecutableDefinitionNode, OperationDefinitionNode, OperationTypeNode, parse } from 'graphql';

export const sha1Hash = (operation: string): string => {
  const hashsum = createHash('sha1');
  hashsum.update(operation);
  return hashsum.digest('hex').toString();
};

export const exists = async (file: string) => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

export const errorLog = (e: unknown): object => {
  const error = e as Error;
  return {
    error: {
      name: error.name,
      message: error.message,
      cause: error.cause,
      stack: error.stack,
    },
  };
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

export const getOperationInfo = (request: Request): { name: string; type: OperationTypeNode; hash: string | undefined } | undefined => {
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

  const operationNodes: OperationDefinitionNode[] = executableNodes.filter((node: any) => !!node?.operation).map((node) => node as OperationDefinitionNode);

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
