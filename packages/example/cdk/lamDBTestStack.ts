import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LamDB } from '@lamdb/infrastructure';
import { join } from 'path';
import { LamDBFunction } from '@lamdb/infrastructure/lib/lamDBFunction';

export class LamDBTestStack extends Stack {
  constructor(scope: Construct, name: string) {
    super(scope, name, {
      stackName: `${name}-test`,
    });

    const lamDB = new LamDB(this, 'LamDBTest', {
      name: 'lambd-test',
      writerFunction: {
        entry: join(__dirname, '../src/index.ts'),
      },
    });

    const queryHandler = new LamDBFunction(this, 'TestQuery', {
      functionName: 'lamdb-test-query',
      entry: join(__dirname, '../src/index.ts'),
      handler: 'queryDatabase',
      reservedConcurrentExecutions: 1,
      environment: {
        DATABASE_STORAGE_BUCKET_NAME: lamDB.databaseStorageBucket.bucketName,
        DATABASE_URL: 'file:/tmp/database.db',
      },
      bundling: {
        nodeModules: ['@prisma/client', 'prisma'],
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: (_, outputDir: string) => [`cp -R packages/example/prisma ${outputDir}`],
          afterBundling: (_, outputDir: string) => [
            `cd ${outputDir}`,
            'npx prisma dev',
            'rm -rf node_modules/@prisma/engines',
            'rm -rf node_modules/@prisma/client/node_modules node_modules/.bin node_modules/prisma',
          ],
        },
      },
    });
    lamDB.databaseStorageBucket.grantReadWrite(queryHandler);
  }
}
