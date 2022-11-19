import { Request } from '@lamdb/commons';
import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { getRequestFromUnion, isRequest } from './utils';

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

const request: Request = {
  method: 'POST',
  body: JSON.stringify({ hello: 'world' }),
  headers: {},
  path: '/',
};

describe('Utils', () => {
  it('returns true if union is Request', () => {
    const result = isRequest(request);

    expect(result).toBe(true);
  });
  it('returns false if union is APIGatewayProxyEventV2', () => {
    const result = isRequest(apiGatewayEvent);

    expect(result).toBe(false);
  });

  it('returns request if union is Request', () => {
    const result = getRequestFromUnion(request);

    expect(result).toBe(request);
  });

  it('returns request if union is APIGatewayProxyEventV2', () => {
    const result = getRequestFromUnion(apiGatewayEvent);

    expect(result).toMatchObject(request);
  });
});
