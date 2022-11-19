import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { expectResource, findResourceProperties } from '../test/expect';
import { LamDBApiTokenAuthorizer } from './lamDBApiTokenAuthorizer';

describe('LamDBApiTokenAuthorizer', () => {
  it('creates authorizer', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    new LamDBApiTokenAuthorizer(
      stack,
      'Authorizer',
      {
        name: 'test',
        tokens: [{ name: 'developer', rotateAfter: Duration.days(1) }],
        tracing: true,
        logLevel: 'debug',
      },
      'ts',
    );

    const template = Template.fromStack(stack);

    expectResource(template, 'AWS::Lambda::Function', 3);
    expect(findResourceProperties(template, 'AWS::Lambda::Function', 0)).toMatchInlineSnapshot(`
      {
        "Architectures": [
          "arm64",
        ],
        "Code": {
          "S3Bucket": {
            "Fn::Sub": "cdk-hnb659fds-assets-\${AWS::AccountId}-\${AWS::Region}",
          },
          "S3Key": "50cd734cd103647a74bbcdf1d78e59d38d7ad1d6cf0df4775a613d150443d497.zip",
        },
        "Environment": {
          "Variables": {
            "AWS_NODEJS_CONNECTION_REUSE_ENABLED": "1",
            "ENABLE_TRACING": "true",
            "LOG_LEVEL": "debug",
            "NODE_OPTIONS": "--enable-source-maps",
            "SECRET_PREFIX": "/test/api-token/",
          },
        },
        "FunctionName": "test-api-token-rotation",
        "Handler": "index.apiTokenRotation",
        "MemorySize": 128,
        "Role": {
          "Fn::GetAtt": [
            "AuthorizerLamDBFunctionApiTokenRotationFunctionServiceRole68D91BC8",
            "Arn",
          ],
        },
        "Runtime": "nodejs16.x",
        "Timeout": 5,
        "TracingConfig": {
          "Mode": "Active",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::Lambda::Function', 1)).toMatchInlineSnapshot(`
      {
        "Architectures": [
          "arm64",
        ],
        "Code": {
          "S3Bucket": {
            "Fn::Sub": "cdk-hnb659fds-assets-\${AWS::AccountId}-\${AWS::Region}",
          },
          "S3Key": "c7c524387dcf46e60cef6b7f90413a6109f2ec294cc5fff2fb6eb28ecaafb930.zip",
        },
        "Environment": {
          "Variables": {
            "AWS_NODEJS_CONNECTION_REUSE_ENABLED": "1",
            "ENABLE_TRACING": "true",
            "LOG_LEVEL": "debug",
            "NODE_OPTIONS": "--enable-source-maps",
            "SECRET_PREFIX": "/test/api-token/",
          },
        },
        "FunctionName": "test-api-token-authorizer",
        "Handler": "index.apiTokenAuthorizer",
        "MemorySize": 512,
        "Role": {
          "Fn::GetAtt": [
            "AuthorizerLamDBFunctionApiTokenAuthorizerFunctionServiceRole9FC12EB5",
            "Arn",
          ],
        },
        "Runtime": "nodejs16.x",
        "Timeout": 5,
        "TracingConfig": {
          "Mode": "Active",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::Lambda::Function', 2)).toMatchInlineSnapshot(`
      {
        "Code": {
          "S3Bucket": {
            "Fn::Sub": "cdk-hnb659fds-assets-\${AWS::AccountId}-\${AWS::Region}",
          },
          "S3Key": "eb5b005c858404ea0c8f68098ed5dcdf5340e02461f149751d10f59c210d5ef8.zip",
        },
        "Handler": "index.handler",
        "Role": {
          "Fn::GetAtt": [
            "LogRetentionaae0aa3c5b4d4f87b02d85b201efdd8aServiceRole9741ECFB",
            "Arn",
          ],
        },
        "Runtime": "nodejs14.x",
      }
    `);

    expectResource(template, 'AWS::SecretsManager::Secret', 1);
    expect(findResourceProperties(template, 'AWS::SecretsManager::Secret')).toMatchInlineSnapshot(`
      {
        "GenerateSecretString": {
          "ExcludePunctuation": true,
          "PasswordLength": 80,
        },
        "Name": "/test/api-token/developer",
      }
    `);

    expectResource(template, 'AWS::SecretsManager::RotationSchedule', 1);
    expect(findResourceProperties(template, 'AWS::SecretsManager::RotationSchedule')).toMatchInlineSnapshot(`
      {
        "RotationLambdaARN": {
          "Fn::GetAtt": [
            "AuthorizerLamDBFunctionApiTokenRotationFunction278F7EF5",
            "Arn",
          ],
        },
        "RotationRules": {
          "AutomaticallyAfterDays": 1,
        },
        "SecretId": {
          "Ref": "Authorizerdeveloper96414FFB",
        },
      }
    `);
  });
});
