import { Architecture, Code, LayerVersion } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { join } from 'path';

/**
 * Lambda Layer containing arm64 Prisma engine binaries.
 * It's an own layer because the binary data is like 80 MB large and would take longer to deploy.
 */
export class LamDBEngineLayer extends LayerVersion {
  constructor(scope: Construct, id: string) {
    super(scope, id, {
      code: Code.fromAsset(join(__dirname, '..', 'dist', 'engine-layer')),
      description: 'Prisma Engine binaries',
      compatibleArchitectures: [Architecture.ARM_64],
    });
  }
}
