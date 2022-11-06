import { Runtime, Architecture } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';

export type LamDBFunctionProps = Pick<NodejsFunctionProps, 'functionName' | 'handler' | 'entry'> &
  Partial<NodejsFunctionProps>;

export class LamDBFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: LamDBFunctionProps) {
    super(scope, `LamDBFunction${id}`, {
      runtime: Runtime.NODEJS_16_X,
      memorySize: 1024 * 4,
      timeout: Duration.seconds(5),
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.ONE_WEEK,
      ...props,
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'node16',
        tsconfig: 'tsconfig.json',
        forceDockerBundling: false,
        ...props.bundling,
      },
    });
  }
}
