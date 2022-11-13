import { testQuery } from '../../../test/testOperation';
import { getTestQueryEngine } from '../../../test/testQueryEngine';
import { operationToRequest } from '../../../test/utils';
import { createLogger } from '@lamdb/commons';
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
        request: operationToRequest(testQuery, {}, 'IntrospectionQuery'),
      },
      next,
    );

    // Introspections are not forwarded to the query engine
    expect(next).not.toHaveBeenCalled();
    expect(response).toMatchSnapshot();
  });
});
