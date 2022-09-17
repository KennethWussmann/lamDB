import { Stack } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { LamDB } from '../lib';

export class LamDBTestStack extends Stack {
  constructor(scope: Construct, name: string) {
    super(scope, name, {
      stackName: `${name}-test`,
    });

    new LamDB(this, 'LamDBTest', {
      name: 'test',
    });
  }
}
