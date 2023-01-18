import { AttributeValue, DynamoDB } from '@aws-sdk/client-dynamodb';
import {
  Request,
  requestSchema,
  responseSchema,
  Response,
  tracer,
  graphQlErrorResponse,
  createLogger,
  errorLog,
  getOperationInfo,
} from '@lamdb/commons';
import { LamDBService } from '@lamdb/core';
import { z } from 'zod';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { DynamoDBRecord } from 'aws-lambda';
import { randomUUID } from 'crypto';

const dynamoDbItemSchema = z
  .object({
    pk: z.string(),
    sk: z.string(),
  })
  .passthrough();

const deferredRequestSchema = z
  .object({
    pk: z.string(),
    sk: z.string(),
    id: z.string(),
    request: requestSchema,
    response: responseSchema.optional(),
    ttl: z.number(),
  })
  .passthrough();

export type DeferredRequest = z.infer<typeof deferredRequestSchema>;

/**
 * Service to handle requests asynchronously.
 */
export class OrchestrationService {
  private logger = createLogger({ name: 'DeferredService' });

  constructor(
    private service: LamDBService,
    private dynamoDbClient: DynamoDB = new DynamoDB({}),
    private tableName: string = process.env.DYNAMODB_TABLE_NAME ?? '',
  ) {}

  @tracer.captureMethod({ captureResponse: false })
  private async createDeferredRequest(request: Request): Promise<DeferredRequest> {
    const requestId = randomUUID();
    const deferredRequest: DeferredRequest = {
      pk: `request#${requestId}`,
      sk: 'none',
      id: requestId,
      request,
      ttl: Math.floor(new Date().getTime() / 1000) + 60, // 1 minute from now.
    };
    try {
      await this.dynamoDbClient.putItem({
        TableName: this.tableName,
        Item: marshall(deferredRequest),
      });
      this.logger.info('4');
    } catch (e) {
      this.logger.error('Failed to save deferred request', errorLog(e));
      throw e;
    }
    return deferredRequest;
  }

  @tracer.captureMethod({ captureResponse: false })
  private async getResponse(requestId: string): Promise<Response | undefined> {
    const { Item } = await this.dynamoDbClient.getItem({
      TableName: this.tableName,
      Key: marshall({
        pk: `request#${requestId}`,
        sk: 'none',
      }),
    });

    if (Item) {
      const deferredRequest = deferredRequestSchema.parse(unmarshall(Item));
      return deferredRequest.response;
    }

    return undefined;
  }

  @tracer.captureMethod({ captureResponse: false })
  private async writeResponse(requestId: string, response: Response): Promise<void> {
    await this.dynamoDbClient.updateItem({
      TableName: this.tableName,
      Key: marshall({
        pk: `request#${requestId}`,
        sk: 'none',
      }),
      UpdateExpression: 'SET #response = :response',
      ExpressionAttributeNames: {
        '#response': 'response',
      },
      ExpressionAttributeValues: marshall({
        ':response': response,
      }),
    });
  }

  @tracer.captureMethod({ captureResponse: false })
  private async pollResponse(requestId: string, until: number): Promise<Response> {
    if (new Date().getTime() > until) {
      throw new Error('Response polling timed out');
    }
    const response = await this.getResponse(requestId);
    if (response) {
      return response;
    } else {
      await new Promise((resolve) => setTimeout(resolve, 50)); // wait before polling again.
      return await this.pollResponse(requestId, until);
    }
  }

  @tracer.captureMethod({ captureResponse: false })
  public async execute(request: Request): Promise<Response> {
    const operationInfo = getOperationInfo(request);
    if (operationInfo?.type !== 'mutation') {
      // no need to defer non-mutations.
      this.logger.debug('Directly executing read request', { request });
      return this.service.execute(request, 'proxy');
    }

    this.logger.debug('Deferring write request', { operationInfo });
    const { id: requestId } = await this.createDeferredRequest(request);
    this.logger.debug('Wrote request to DynamoDB', { operationInfo, requestId });
    try {
      const response = await this.pollResponse(requestId, new Date().getTime() + 15000); // 15 seconds from now.
      this.logger.info('Found response for request', { operationInfo, requestId });
      return response;
    } catch (e: any) {
      this.logger.error('Error while polling for response', { ...errorLog(e), operationInfo, requestId });
      return graphQlErrorResponse(e?.message ?? 'Failed to get response');
    }
  }

  @tracer.captureMethod()
  public async handleRecords(records: DynamoDBRecord[]): Promise<void> {
    const requestIds = await Promise.all(
      records.map(async (record) => {
        if (record.eventName !== 'INSERT' || !record.dynamodb?.NewImage) {
          return;
        }
        const newImage = unmarshall(record.dynamodb.NewImage as { [key: string]: AttributeValue });
        const dynamoDbItem = dynamoDbItemSchema.parse(newImage);
        if (!dynamoDbItem.pk.startsWith('request#')) {
          return;
        }
        const { request, id } = deferredRequestSchema.parse(newImage);
        this.logger.info('Handling deferred request', { id });
        const response = await this.service.execute(request, 'proxy');
        await this.writeResponse(id, response);
        return id;
      }),
    );
    this.logger.info(`Wrote responses of ${requestIds.length} requests`, { requestIds });
  }
}
