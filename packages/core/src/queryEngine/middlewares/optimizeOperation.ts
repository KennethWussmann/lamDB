import { optimizeDocuments as relayOperationOptimizer } from '@graphql-tools/relay-operation-optimizer';
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
import { Logger } from 'winston';
import { errorLog, sha1Hash, Response, captureMethod, captureMethodSync, tracer } from '@lamdb/commons';
import { Middleware, MiddlewareContext, MiddlewareNextFunction } from './middleware';

class OptimizeOperationMiddleware implements Middleware {
  private inlineVariables = (schema: GraphQLSchema, variables: Record<string, unknown>, document: DocumentNode) =>
    captureMethodSync({
      segmentName: '### OptimizeOperationMiddleware.inlineVariables',
      method: () => {
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
      },
    });

  private generateOperationName = (document: DocumentNode) =>
    captureMethodSync({
      segmentName: '### OptimizeOperationMiddleware.generateOperationName',
      method: () =>
        visit(document, {
          OperationDefinition: (node: OperationDefinitionNode) => {
            if (!node.name) {
              // Prisma client does not supply operation names, but the relay optimizer requires one
              const operationName = `${node.operation}_${sha1Hash(print(node)).substring(0, 8)}`;
              tracer.getSegment().addMetadata('operationName', operationName);
              return {
                ...node,
                name: {
                  kind: Kind.NAME,
                  // Operation names have to start with letters, so we prepend query, mutation, subscription
                  value: operationName,
                },
              };
            }
            return node;
          },
        }),
    });

  private inlineFragments = (schema: GraphQLSchema, document: DocumentNode): DocumentNode =>
    captureMethodSync({
      segmentName: '### OptimizeOperationMiddleware.inlineFragments',
      method: () =>
        relayOperationOptimizer(schema, [document], {
          includeFragments: false,
          assumeValid: true,
          noLocation: true,
        })[0],
    });

  private optimizeDocument = (
    logger: Logger,
    schema: GraphQLSchema,
    variables: Record<string, unknown>,
    document: DocumentNode,
  ): DocumentNode =>
    captureMethodSync({
      segmentName: '### OptimizeOperationMiddleware.optimizeDocument',
      method: () => {
        try {
          const operationWithName = this.generateOperationName(document);
          const operationWithoutFragments = this.inlineFragments(schema, operationWithName);
          return this.inlineVariables(schema, variables, operationWithoutFragments);
        } catch (e) {
          logger.error('Failed to optimize operation. Returning unoptimized operation instead.', {
            document,
            ...errorLog(e),
          });
          tracer.addErrorAsMetadata(e as Error);
        }
        return document;
      },
    });

  private optimize = (logger: Logger, schema: GraphQLSchema, document: string): string =>
    captureMethodSync({
      segmentName: '### OptimizeOperationMiddleware.optimize',
      method: () => {
        const parsedDocument = JSON.parse(document);
        const optimizedOperation = this.optimizeDocument(
          logger,
          schema,
          parsedDocument?.variables ?? {},
          parse(parsedDocument.query, {
            noLocation: true,
          }),
        );
        try {
          return JSON.stringify({
            operationName: parsedDocument.operationName,
            variables: {},
            // TODO: This still throws an error
            // invalid AST Node: {}
            query: print(optimizedOperation),
          });
        } catch (e) {
          logger.error('Failed to print operation. Returning unoptimized operation instead.', {
            document,
            optimizedOperation,
            ...errorLog(e),
          });
          tracer.addErrorAsMetadata(e as Error);
        }
        return document;
      },
    });

  handle = async (context: MiddlewareContext, next: MiddlewareNextFunction): Promise<Response> =>
    await captureMethod({
      segmentName: '### OptimizeOperationMiddleware.handle',
      method: async () => {
        if (context.request.method.toLowerCase() !== 'post' || !context.request.body) {
          // skip middleware if not graphql or body empty
          return next(context);
        }
        return next({
          ...context,
          request: {
            ...context.request,
            body: this.optimize(context.logger, await context.queryEngine.getSchema(), context.request.body),
          },
        });
      },
    });
}

const middlewareClass = new OptimizeOperationMiddleware();
export const optimizeOperation = middlewareClass.handle.bind(middlewareClass);
