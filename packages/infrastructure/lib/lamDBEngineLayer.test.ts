import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { expectProperties } from '../test/expect';
import { LamDBEngineLayer } from './lamDBEngineLayer';

describe('LamDBEngineLayer', () => {
  it('creates lambda layer', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    new LamDBEngineLayer(stack, 'EngineLayer');

    const template = Template.fromStack(stack);

    expectProperties(template, 'AWS::Lambda::LayerVersion', {
      CompatibleArchitectures: ['arm64'],
      Content: {
        S3Bucket: {
          'Fn::Sub': expect.any(String),
        },
        S3Key: expect.any(String),
      },
      Description: 'Prisma Engine binaries',
    });
  });
});
