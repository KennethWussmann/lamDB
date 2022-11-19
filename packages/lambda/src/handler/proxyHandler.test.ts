import { Context } from 'aws-lambda';
import { mock } from 'jest-mock-extended';
import { QueryRouter } from '../queryRouter';
import { ProxyHandler } from './proxyHandler';

let queryRouter: jest.Mocked<QueryRouter>;
let handler: ProxyHandler;

describe('ProxyHandler', () => {
  beforeEach(() => {
    process.env.READER_FUNCTION_ARN = 'arn:aws:lambda:eu-central-1:123456789012:function:reader';
    process.env.WRITER_FUNCTION_ARN = 'arn:aws:lambda:eu-central-1:123456789012:function:writer';

    queryRouter = mock<QueryRouter>();
    handler = new ProxyHandler(queryRouter);
  });

  it('throws error when readerFunctionArn unset', async () => {
    delete process.env.READER_FUNCTION_ARN;
    expect(() => new ProxyHandler()).toThrow('Required environment variable READER_FUNCTION_ARN not set');
  });

  it('throws error when writerFunctionArn unset', async () => {
    delete process.env.WRITER_FUNCTION_ARN;
    expect(() => new ProxyHandler()).toThrow('Required environment variable WRITER_FUNCTION_ARN not set');
  });

  it('routes query through queryRouter and returns response', async () => {
    const queryResponse = {
      body: JSON.stringify({ query: 'mutation { test { id } }', operationName: 'TestOperation' }),
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'x-lamdb-operation-hash': '00cfd6b0508a41d30eb094fa1ed5a2b505c2a13d',
        'x-lamdb-operation-name': 'TestOperation',
        'x-lamdb-operation-type': 'mutation',
        'x-lamdb-router': 'true',
      },
      status: 200,
    };
    queryRouter.routeQuery.mockResolvedValue(queryResponse);

    const response = await handler.handler(
      { body: JSON.stringify({ query: 'mutation { test { id } }', operationName: 'TestOperation' }), method: 'POST' },
      {} as Context,
    );

    expect(response).toMatchInlineSnapshot(`
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
        "isBase64Encoded": false,
        "statusCode": 200,
      }
    `);
  });
});
