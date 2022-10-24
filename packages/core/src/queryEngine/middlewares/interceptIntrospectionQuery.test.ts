import { getTestQueryEngine } from '../../../test/testQueryEngine';
import { operationToRequest } from '../../../test/utils';
import { createLogger } from '../../logger';
import { interceptIntrospectionQuery } from './interceptIntrospectionQuery';
import { MiddlewareContext } from './middleware';

let context: Pick<MiddlewareContext, 'queryEngine' | 'logger'>;

describe('interceptIntrospectionQuery middleware', () => {
  beforeEach(() => {
    context = {
      queryEngine: getTestQueryEngine(),
      logger: createLogger({ name: 'test' }),
    };
  });

  it('intercepts introspection queries and resolves them locally', async () => {
    const next = jest.fn();

    const response = await interceptIntrospectionQuery(
      {
        ...context,
        request: operationToRequest(
          `
          query TestOperation {
            # the operation itself doesn't matter, we'll generate one
            findManyArticle {
              id
            }
          }
          `,
          {},
          'IntrospectionQuery',
        ),
      },
      next,
    );

    // Introspections are not forwarded to the query engine
    expect(next).not.toHaveBeenCalled();
    expect(response).toMatchSnapshot();
  });
});
