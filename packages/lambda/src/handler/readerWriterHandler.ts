import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, Callback, Context, Handler } from 'aws-lambda';
import { isRequest, toApiGatewayResponse } from '../utils';
import { Request } from '@lamdb/core';
import { defaultApplicationContext } from '../applicationContext';

const handleRequest =
  (endpointType: 'reader' | 'writer', { serverlessExpressHandler, service } = defaultApplicationContext): Handler =>
  async (
    request: APIGatewayProxyEventV2 | Request,
    context: Context,
    callback: Callback<APIGatewayProxyResultV2>,
  ): Promise<APIGatewayProxyResultV2> => {
    if (isRequest(request)) {
      return toApiGatewayResponse(await service.execute(request, endpointType));
    }
    return serverlessExpressHandler(request, context, callback);
  };

export const readerHandler: Handler = handleRequest('reader');
export const writerHandler: Handler = handleRequest('writer');
