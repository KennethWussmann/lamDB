import { randomUUID } from 'crypto';
import { errorLog, exists, graphQlErrorResponse } from './utils';

describe('Utils', () => {
  it('returns true if file exists', async () => {
    const result = await exists('package.json');
    expect(result).toBe(true);
  });
  it('returns false if file does not exist', async () => {
    const result = await exists(randomUUID());
    expect(result).toBe(false);
  });

  it('converts error to loggable object', () => {
    const obj = errorLog(new Error('Something went wrong'));
    expect(obj).toMatchObject({
      error: {
        cause: undefined,
        message: 'Something went wrong',
        name: 'Error',
        stack: expect.any(String),
      },
    });
  });

  it('wraps error message into GraphQL compliant error response', () => {
    const obj = graphQlErrorResponse('Something went wrong');
    expect(obj).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Something went wrong"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });
});
