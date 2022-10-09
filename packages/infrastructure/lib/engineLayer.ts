import { Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';

export class EngineLayer extends LayerVersion {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      code: Code.fromAsset(join(__dirname, '..', '..', 'engine-layer', 'dist')),
      description: 'Prisma Engine binaries',
    });
  }
}
