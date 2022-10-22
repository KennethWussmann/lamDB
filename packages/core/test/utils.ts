import { DocumentNode, print } from 'graphql';
import { Request } from '../src';

export const operationDocumentNodeToRequest = (
  operation: DocumentNode,
  variables: Record<string, unknown> | undefined = undefined,
) => operationToRequest(print(operation), variables);

export const operationToRequest = (
  operation: string,
  variables: Record<string, unknown> | undefined = undefined,
): Request => ({
  method: 'POST',
  body: JSON.stringify({
    operationName: 'TestOperation',
    query: operation,
    variables,
  }),
});
