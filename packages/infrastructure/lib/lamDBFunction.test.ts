import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Tracing } from 'aws-cdk-lib/aws-lambda';
import { join } from 'path';
import { expectProperties } from '../test/expect';
import { LamDBFunction } from './lamDBFunction';

describe('LamDBFunction', () => {
  it('creates lambda function', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    new LamDBFunction(stack, 'Function', {
      functionName: 'test-function',
      handler: 'test.handler',
      entry: join(__dirname, 'lambda', 'proxy.ts'),
      logLevel: 'debug',
      tracing: Tracing.ACTIVE,
      environment: {
        MY_ADDITIONAL_ENV: 'test',
      },
    });

    const template = Template.fromStack(stack);

    expectProperties(template, 'AWS::Lambda::Function', {
      Code: {
        S3Bucket: {
          'Fn::Sub': 'cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}',
        },
        S3Key: expect.any(String),
      },
      Role: {
        'Fn::GetAtt': ['LamDBFunctionFunctionServiceRoleEC87CD5E', 'Arn'],
      },
      Architectures: ['arm64'],
      Environment: {
        Variables: {
          ENABLE_TRACING: 'true',
          NODE_OPTIONS: '--enable-source-maps',
          LOG_LEVEL: 'debug',
          AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
          MY_ADDITIONAL_ENV: 'test',
        },
      },
      FunctionName: 'test-function',
      Handler: 'index.test.handler',
      MemorySize: 2048,
      Runtime: 'nodejs18.x',
      Timeout: 5,
    });
  });
});
