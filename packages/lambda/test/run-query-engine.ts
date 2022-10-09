import { QueryEngine } from '../src/queryEngine/queryEngine';

const start = async () => {
  process.env.LOG_LEVEL = 'debug';
  const engine = new QueryEngine({
    binaryPath: '/Users/kenneth/SynologyDrive/Development/lamDB/packages/engine-layer/dist/query-engine',
    prismaSchemaPath: '/Users/kenneth/SynologyDrive/Development/lamDB/packages/example/prisma/schema.prisma',
    databaseFilePath: '/Users/kenneth/SynologyDrive/Development/lamDB/packages/example/prisma/dev.db',
    enablePlayground: true,
    debug: true,
    port: 8080,
  });

  void engine.start();

  const response = await engine.proxy({
    method: 'post',
    body: JSON.stringify({
      operationName: 'Test',
      query: `
      fragment UserFragment on User {
        id
        email
        name
      }
      query Test {
        findFirstUser(where:{
          id: {
            equals: 1
          }
        }) {
          ... UserFragment
        }
      }
      `,
    }),
  });
  console.log(response);
};

start().catch(console.error);
