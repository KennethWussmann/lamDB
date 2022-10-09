import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LamDB } from '@lamdb/infrastructure';
import { join } from 'path';

export class LamDBTestStack extends Stack {
  constructor(scope: Construct, name: string) {
    super(scope, name, {
      stackName: `${name}-test`,
    });

    new LamDB(this, 'LamDBTest', {
      name: 'lambd-test',
      schemaPath: join(__dirname, '../prisma/schema.prisma'),
      enablePlayground: true,
      enableRawQueries: true,
      writerFunction: {
        entry: join(__dirname, '../src/index.ts'),
      },
    });
  }
}
