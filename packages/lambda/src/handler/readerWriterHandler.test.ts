let service: jest.Mocked<LamDBService>;
jest.mock('../applicationContext', () => ({
  defaultApplicationContext: { service, configuration: new LamDBConfiguration() },
}));

import { LamDBConfiguration, LamDBService } from '@lamdb/core';
import { APIGatewayProxyEventV2, Context } from 'aws-lambda';
import { mock } from 'jest-mock-extended';
import { ReaderWriterHandler } from './readerWriterHandler';

let handler: ReaderWriterHandler;
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
const request = {
  body: JSON.stringify({ query: 'mutation { test { id } }', operationName: 'TestOperation' }),
  method: 'POST',
};
const apiGatewayEvent: APIGatewayProxyEventV2 = {
  headers: {},
  isBase64Encoded: false,
  rawPath: '/',
  rawQueryString: '',
  requestContext: {
    accountId: '',
    apiId: '',
    domainName: '',
    domainPrefix: '',
    http: {
      method: 'POST',
      path: '/',
      protocol: 'HTTP/1.1',
      sourceIp: '',
      userAgent: '',
    },
    requestId: '',
    routeKey: '',
    stage: '',
    time: '',
    timeEpoch: 0,
  },
  routeKey: '',
  stageVariables: {},
  version: '',
  body: JSON.stringify({ hello: 'world' }),
};

describe('ReaderWriterHandler', () => {
  beforeEach(() => {
    service = mock<LamDBService>();
    handler = new ReaderWriterHandler('reader', service);
  });

  it('executes given request and returns response', async () => {
    service.execute.mockResolvedValue(queryResponse);

    const response = await handler.handler(request, {} as Context);

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

  it('executes given APIGatewayProxyEventV2 and returns response', async () => {
    service.execute.mockResolvedValue(queryResponse);

    const response = await handler.handler(apiGatewayEvent, {} as Context);

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
