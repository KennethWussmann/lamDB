import { LamDB } from '@lamdb/infrastructure';
import { Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join } from 'path';

export class LamDBTestStack extends Stack {
  constructor(scope: Construct, name: string) {
    super(scope, name, {
      stackName: `${name}-test`,
    });

    new LamDB(this, 'LamDBTest', {
      name: 'lamdb-test',
      schemaPath: join(__dirname, '../prisma/schema.prisma'),
      logLevel: 'debug',
      exposeReaderWriterEndpoints: true,
      apiTokens: [
        {
          name: 'developer',
          rotateAfter: Duration.days(14),
        },
      ],
    });
  }
}
