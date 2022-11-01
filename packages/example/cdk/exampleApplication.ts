import { CorsHttpMethod, HttpApi, HttpMethod } from '@aws-cdk/aws-apigatewayv2-alpha';
import { LamDB } from '@lamdb/infrastructure';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import { join } from 'path';
import { HttpLambdaIntegration } from '@aws-cdk/aws-apigatewayv2-integrations-alpha';
import { Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';

/**
 * Contains infrastructure necessary to deploy our example application to AWS.
 * This is not strictly necessary but there to showcase an example integration of LamDB into serverless applications.
 */
export class ExampleApplication extends Construct {
  constructor(scope: Construct, id: string, schemaPath: string, lamDB: LamDB) {
    super(scope, id);

    // Use the first best API token secret, or throw an error if there are none
    const apiTokenSecret = lamDB.authorizer?.secrets?.[0];
    if (!apiTokenSecret) {
      throw new Error('No api token secret found');
    }

    const search = new NodejsFunction(this, 'SearchFunction', {
      functionName: 'lamdb-example-search',
      entry: join(__dirname, '..', 'src', 'index.ts'),
      handler: 'search',
      memorySize: 1024 * 4,
      runtime: Runtime.NODEJS_16_X,
      timeout: Duration.seconds(30),
      logRetention: RetentionDays.ONE_DAY,
      environment: {
        // Get the api gateway url of the lamDB instance
        LAMDB_BASE_URL: lamDB.api.url ?? '',
        LAMDB_API_TOKEN_SECRET_ID: apiTokenSecret.secretArn,
      },
      bundling: {
        // use locally installed esbuild
        forceDockerBundling: false,
        // using prisma client on Lambda using CDK is somewhat special
        // refer to https://dev.to/prisma/bundling-prisma-with-the-cdk-using-aws-lambda-nodejs-2lkd
        nodeModules: ['@prisma/client', 'prisma'],
        commandHooks: {
          beforeBundling: () => [],
          beforeInstall: (_: string, outputDir: string) => [
            `echo "Copying prisma schema from ${schemaPath} to ${outputDir}"`,
            `cp ${schemaPath} ${outputDir}`,
          ],
          afterBundling: (_: string, outputDir: string) => [
            `cd ${outputDir}`,
            `npx prisma generate --data-proxy`,
            `rm -rf node_modules/@prisma/engines`,
          ],
        },
      },
    });

    // Allow our search lambda to read the API token for LamDB from SecretsManager
    apiTokenSecret.grantRead(search);

    const api = new HttpApi(this, 'ExampleApi', {
      apiName: 'lamdb-example-api',
      corsPreflight: {
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
        allowMethods: [CorsHttpMethod.ANY],
        allowOrigins: ['*'],
      },
    });

    api.addRoutes({
      integration: new HttpLambdaIntegration('SearchIntegration', search),
      path: '/search',
      methods: [HttpMethod.POST],
    });
  }
}
