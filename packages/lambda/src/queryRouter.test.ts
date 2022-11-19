import { Lambda } from '@aws-sdk/client-lambda';
import { mock } from 'jest-mock-extended';
import { QueryRouter } from './queryRouter';

let lambdaMock: jest.Mocked<Lambda>;
const router = new QueryRouter();

describe('QueryRouter', () => {
  beforeEach(() => {
    lambdaMock = mock<Lambda>();
  });

  it('returns error when operation info cannot be retrieved', async () => {
    const response = await router.routeQuery(
      lambdaMock,
      { body: undefined, method: 'GET' },
      'writer-arn',
      'reader-arn',
    );

    expect(lambdaMock.invoke).not.toHaveBeenCalled();
    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Failed to route request: Could not determine GraphQL operation type"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });

  it('returns error when operation type is not supported', async () => {
    const response = await router.routeQuery(
      lambdaMock,
      { body: JSON.stringify({ query: 'subscription { test { id } }' }), method: 'POST' },
      'writer-arn',
      'reader-arn',
    );

    expect(lambdaMock.invoke).not.toHaveBeenCalled();
    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Failed to route request: Unsupported operation type 'subscription'"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });

  it('invokes reader for queries', async () => {
    lambdaMock.invoke.mockResolvedValue({
      Payload: JSON.stringify({
        body: JSON.stringify({ data: { test: { id: 'test-id' } } }),
        headers: { 'content-type': 'application/json' },
        statusCode: 200,
      }),
    } as never);

    const response = await router.routeQuery(
      lambdaMock,
      { body: JSON.stringify({ query: 'query { test { id } }', operationName: 'TestOperation' }), method: 'POST' },
      'writer-arn',
      'reader-arn',
    );

    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":{"test":{"id":"test-id"}}}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 200,
      }
    `);
    expect((lambdaMock.invoke.mock.calls[0][0] as any).FunctionName).toBe('reader-arn');
    expect(JSON.parse(Buffer.from((lambdaMock.invoke.mock.calls[0][0] as any).Payload).toString('utf8')))
      .toMatchInlineSnapshot(`
      {
        "body": "{"query":"query { test { id } }","operationName":"TestOperation"}",
        "headers": {
          "accept": "application/json",
          "content-type": "application/json",
          "x-lamdb-operation-hash": "8894a4dab72222b22b4ff9d1b907f2d80e489afe",
          "x-lamdb-operation-name": "TestOperation",
          "x-lamdb-operation-type": "query",
          "x-lamdb-router": "true",
        },
        "method": "POST",
      }
    `);
  });

  it('invokes writer for mutations', async () => {
    lambdaMock.invoke.mockResolvedValue({
      Payload: JSON.stringify({
        body: JSON.stringify({ data: { test: { id: 'test-id' } } }),
        headers: { 'content-type': 'application/json' },
        statusCode: 200,
      }),
    } as never);

    const response = await router.routeQuery(
      lambdaMock,
      { body: JSON.stringify({ query: 'mutation { test { id } }', operationName: 'TestOperation' }), method: 'POST' },
      'writer-arn',
      'reader-arn',
    );

    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":{"test":{"id":"test-id"}}}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 200,
      }
    `);
    expect((lambdaMock.invoke.mock.calls[0][0] as any).FunctionName).toBe('writer-arn');
    expect(JSON.parse(Buffer.from((lambdaMock.invoke.mock.calls[0][0] as any).Payload).toString('utf8')))
      .toMatchInlineSnapshot(`
      {
        "body": "{"query":"mutation { test { id } }","operationName":"TestOperation"}",
        "headers": {
          "accept": "application/json",
          "content-type": "application/json",
          "x-lamdb-operation-hash": "00cfd6b0508a41d30eb094fa1ed5a2b505c2a13d",
          "x-lamdb-operation-name": "TestOperation",
          "x-lamdb-operation-type": "mutation",
          "x-lamdb-router": "true",
        },
        "method": "POST",
      }
    `);
  });

  it('retries invocations 3 times', async () => {
    lambdaMock.invoke.mockRejectedValue({
      name: 'TooManyRequestsException',
    } as never);

    const response = await router.routeQuery(
      lambdaMock,
      { body: JSON.stringify({ query: 'query { test { id } }', operationName: 'TestOperation' }), method: 'POST' },
      'writer-arn',
      'reader-arn',
    );

    expect(lambdaMock.invoke).toHaveBeenCalledTimes(3);
    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Failed to route request: Request failed: Max retry attempts reached"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });

  it('returns GraphQL error when lambda invoke did not contain response payload', async () => {
    lambdaMock.invoke.mockResolvedValue({
      Payload: undefined,
    } as never);

    const response = await router.routeQuery(
      lambdaMock,
      { body: JSON.stringify({ query: 'query { test { id } }', operationName: 'TestOperation' }), method: 'POST' },
      'writer-arn',
      'reader-arn',
    );

    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Failed to route request: Request failed: Failed to parse lambda response payload"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });
});
