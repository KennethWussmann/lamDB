import { LamDB } from '@lamdb/infrastructure';
import { Duration, Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { join } from 'path';
import { ExampleApplication } from './exampleApplication';

export class LamDBTestStack extends Stack {
  constructor(scope: Construct, name: string) {
    super(scope, name, {
      stackName: `${name}-test`,
    });

    const schemaPath = join(__dirname, '../prisma/schema.prisma');

    // This is all what's needed to deploy a new serverless relation database using LamDB
    const lamDB = new LamDB(this, 'LamDBTest', {
      // Give a unique name to name and identify the infrastructure
      name: 'lamdb-test',
      // Provide the path to our example Prisma schema
      schemaPath,
      // Optional: Using token based authentication and rotate token every 14 days
      apiTokens: [
        {
          name: 'developer',
          rotateAfter: Duration.days(14),
        },
      ],
      // Optional: Define some logging level for debugging and add reader/writer endpoints for testing
      logLevel: 'info',
      exposeReaderWriterEndpoints: true,
      tracing: true,
    });

    // Additional infrastructure for this specific example application
    new ExampleApplication(this, 'ExampleApplication', schemaPath, lamDB);
  }
}
