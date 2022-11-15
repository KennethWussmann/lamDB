import { Request } from '@lamdb/commons';
import { DocumentNode, print } from 'graphql';

export const operationDocumentNodeToRequest = (operation: DocumentNode, variables: Record<string, unknown> | undefined = undefined) =>
  operationToRequest(print(operation), variables);

export const operationToRequest = (
  operation: string,
  variables: Record<string, unknown> | undefined = undefined,
  operationName = 'TestOperation',
): Request => ({
  method: 'POST',
  body: JSON.stringify({
    operationName,
    query: operation,
    variables,
  }),
});
