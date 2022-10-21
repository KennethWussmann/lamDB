import { Architecture, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';

export class LamDBEngineLayer extends LayerVersion {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      code: Code.fromAsset(join(__dirname, '..', '..', 'engine-layer', 'dist')),
      description: 'Prisma Engine binaries',
      compatibleArchitectures: [Architecture.ARM_64],
    });
  }
}
