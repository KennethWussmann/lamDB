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

    new LamDBFunction(this, 'TestQuery', {
      functionName: 'lamdb-test-query',
      entry: join(__dirname, '../src/index.ts'),
      handler: 'queryDatabase',
      reservedConcurrentExecutions: 1,
      environment: {
        DATABASE_STORAGE_BUCKET_NAME: lamDB.databaseStorageBucket.bucketName,
        DATABASE_URL: 'file:/tmp/database.db',
      },
    });
  }
}
