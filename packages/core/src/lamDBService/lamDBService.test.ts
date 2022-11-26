import { mock } from 'jest-mock-extended';
import { createArticle, findArticle } from '../../test/testOperation';
import { MigrationEngine } from '../migrationEngine';
import { QueryEngine } from '../queryEngine';
import { LamDBService } from './lamDBService';

let queryEngineMock: jest.Mocked<QueryEngine>;
let migrationEngineMock: jest.Mocked<MigrationEngine>;
let service: LamDBService;

describe('LamDBService', () => {
  beforeEach(() => {
    queryEngineMock = mock<QueryEngine>();
    migrationEngineMock = mock<MigrationEngine>();
    service = new LamDBService(
      {
        migrationEngineBinaryPath: '',
        queryEngineLibraryPath: '',
        databasePath: '',
        prismaSchemaPath: '',
        operationOptimization: false,
        server: {
          allowCors: false,
          proxyPort: 1,
        },
      },
      queryEngineMock,
      migrationEngineMock,
    );
  });

  it('executes operations using query engine', async () => {
    queryEngineMock.execute.mockResolvedValue({
      body: JSON.stringify({
        data: {
          findUniqueArticle: {
            id: 4,
            url: 'https://example.com',
            title: 'Example article',
            subtitle: 'An example exciting article',
            publication: 'That One Site',
            claps: 100,
          },
        },
      }),
      headers: {
        'content-type': 'application/json',
      },
      status: 200,
    });

    const response = await service.execute(findArticle(), 'reader');

    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":{"findUniqueArticle":{"id":4,"url":"https://example.com","title":"Example article","subtitle":"An example exciting article","publication":"That One Site","claps":100}}}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 200,
      }
    `);
  });

  it('does not execute mutations on readers', async () => {
    const response = await service.execute(createArticle(), 'reader');

    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Cannot execute mutations in read-only mode"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });

  it('returns error response thrown from executing operation in query engine', async () => {
    queryEngineMock.execute.mockImplementation(() => {
      throw new Error('Something went wrong');
    });
    const response = await service.execute(findArticle(), 'reader');

    expect(response).toMatchInlineSnapshot(`
      {
        "body": "{"data":null,"errors":[{"message":"Failed to proxy request: Something went wrong"}]}",
        "headers": {
          "content-type": "application/json",
        },
        "status": 400,
      }
    `);
  });

  it('uses migration engine to apply migrations', async () => {
    migrationEngineMock.apply.mockResolvedValue([]);

    await service.migrate();

    expect(migrationEngineMock.apply).toHaveBeenCalled();
  });

  it('uses migration engine to reset filesystem', async () => {
    await service.reset();

    expect(migrationEngineMock.reset).toHaveBeenCalledTimes(1);
  });
});
