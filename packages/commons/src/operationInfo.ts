import { Request } from './requestResponse';
import { isExecutableDefinitionNode, OperationDefinitionNode, OperationTypeNode, parse } from 'graphql';
import { sha1Hash } from './utils';

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
