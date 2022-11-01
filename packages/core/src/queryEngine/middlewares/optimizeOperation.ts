import { optimizeDocuments as inlineFragments } from '@graphql-tools/relay-operation-optimizer';
import {
  ArgumentNode,
  astFromValue,
  DocumentNode,
  GraphQLInputType,
  GraphQLSchema,
  GraphQLType,
  Kind,
  OperationDefinitionNode,
  parse,
  print,
  typeFromAST,
  VariableDefinitionNode,
  visit,
} from 'graphql';
import { Response } from '../../requestResponse';
import { sha1Hash } from '../../utils';
import { MiddlewareContext, MiddlewareNextFunction, QueryEngineProxyMiddleware } from './middleware';

const inlineVariables = (
  schema: GraphQLSchema,
  variables: Record<string, unknown>,
  document: DocumentNode,
): DocumentNode => {
  if (Object.keys(variables).length === 0) {
    return document;
  }
  const variableDefinitions: Record<string, GraphQLType> = {};
  return visit(document, {
    VariableDefinition: (node: VariableDefinitionNode) => {
      const type = typeFromAST(schema, node.type);
      if (type) {
        variableDefinitions[node.variable.name.value] = type;
      }
      return null;
    },
    Argument: (node: ArgumentNode) => {
      if (node.value.kind === Kind.VARIABLE) {
        if (!variables[node.value.name.value]) {
          // if supplied variables does not contain this variable, remove immediately
          return null;
        }
        const type = astFromValue(
          variables[node.value.name.value],
          variableDefinitions[node.value.name.value] as GraphQLInputType,
        );
        if (type?.kind === Kind.NULL) {
          // query engine does not like when nullable arguments actually are written out with null.
          // in case it's a variable and it's value is null, remove argument entirely.
          return null;
        }
        return { ...node, value: type };
      }
      return node;
    },
  });
};

const generateOperationName = (document: DocumentNode) => {
  return visit(document, {
    OperationDefinition: (node: OperationDefinitionNode) => {
      if (!node.name) {
        // Prisma client does not supply operation names, but the relay optimizer requires one
        return {
          ...node,
          name: {
            kind: Kind.NAME,
            // Operation names have to start with letters, so we prepend query, mutation, subscription
            value: `${node.operation}_${sha1Hash(print(node)).substring(0, 8)}`,
          },
        };
      }
      return node;
    },
  });
};

const optimizeDocument = (
  schema: GraphQLSchema,
  variables: Record<string, unknown>,
  document: DocumentNode,
): DocumentNode =>
  inlineVariables(
    schema,
    variables,
    inlineFragments(schema, [generateOperationName(document)], {
      includeFragments: false,
      assumeValid: true,
      noLocation: true,
    })[0],
  );

const optimize = (schema: GraphQLSchema, document: string) => {
  const parsedDocument = JSON.parse(document);
  return JSON.stringify({
    operationName: parsedDocument.operationName,
    variables: {},
    query: print(
      optimizeDocument(
        schema,
        parsedDocument?.variables ?? {},
        parse(parsedDocument.query, {
          noLocation: true,
        }),
      ),
    ),
  });
};

export const optimizeOperation: QueryEngineProxyMiddleware = async (
  context: MiddlewareContext,
  next: MiddlewareNextFunction,
): Promise<Response> => {
  if (context.request.method.toLowerCase() !== 'post' || !context.request.body) {
    // skip middleware if not graphql or body empty
    return next(context);
  }
  return next({
    ...context,
    request: {
      ...context.request,
      body: optimize(await context.queryEngine.getSchema(), context.request.body),
    },
  });
};
