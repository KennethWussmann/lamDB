import { optimizeDocuments as inlineFragments } from '@graphql-tools/relay-operation-optimizer';
import {
  ArgumentNode,
  astFromValue,
  DocumentNode,
  GraphQLInputType,
  GraphQLSchema,
  GraphQLType,
  Kind,
  parse,
  print,
  typeFromAST,
  VariableDefinitionNode,
  visit,
} from 'graphql';
import { Response } from '../../requestResponse';
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

const optimizeDocument = (
  schema: GraphQLSchema,
  variables: Record<string, unknown>,
  document: DocumentNode,
): DocumentNode =>
  inlineVariables(
    schema,
    variables,
    inlineFragments(schema, [document], {
      includeFragments: false,
      assumeValid: true,
      noLocation: true,
    })[0],
  );

const optimize = (schema: GraphQLSchema, document: string) => {
  const parsedDocument = JSON.parse(document);
  return JSON.stringify({
    operationName: parsedDocument.operationName,
    variables: parsedDocument.variables,
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
