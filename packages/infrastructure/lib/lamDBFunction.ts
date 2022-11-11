import { Runtime, Architecture, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { LamDBProps } from './types';

export type LamDBFunctionProps = Pick<NodejsFunctionProps, 'functionName' | 'handler' | 'entry'> &
  Partial<NodejsFunctionProps> &
  Pick<LamDBProps, 'logLevel'>;

export class LamDBFunction extends NodejsFunction {
  constructor(scope: Construct, id: string, props: LamDBFunctionProps) {
    super(scope, `LamDBFunction${id}`, {
      runtime: Runtime.NODEJS_16_X,
      memorySize: 1024 * 2,
      timeout: Duration.seconds(5),
      architecture: Architecture.ARM_64,
      logRetention: RetentionDays.ONE_WEEK,
      ...props,
      bundling: {
        minify: true,
        sourceMap: props.logLevel === 'debug',
        target: 'node16',
        tsconfig: 'tsconfig.json',
        ...props.bundling,
      },
      environment: {
        ENABLE_TRACING: props.tracing === Tracing.ACTIVE ? 'true' : 'false',
        NODE_OPTIONS: props.logLevel === 'debug' ? '--enable-source-maps' : '',
        LOG_LEVEL: props.logLevel ?? 'info',
        ...props.environment,
      },
    });
  }
}
