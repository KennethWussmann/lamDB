/* eslint-disable jest/expect-expect */
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { LamDBStorage } from './lamDBStorage';

describe('LamDBStorage', () => {
  it('creates S3 bucket with account id and name', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    new LamDBStorage(stack, 'Storage', 'test');

    const template = Template.fromStack(stack);

    template.hasResourceProperties('AWS::S3::Bucket', {
      AccessControl: 'Private',
      BucketName: {
        'Fn::Join': [
          '',
          [
            {
              Ref: 'AWS::AccountId',
            },
            '-test-database',
          ],
        ],
      },
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
        IgnorePublicAcls: true,
        RestrictPublicBuckets: true,
      },
      VersioningConfiguration: {
        Status: 'Enabled',
      },
    });
  });
});
