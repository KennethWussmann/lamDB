import { Aws, RemovalPolicy } from 'aws-cdk-lib';
import { BlockPublicAccess, Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class LamDBStorage extends Bucket {
  constructor(scope: Construct, id: string, name: string) {
    super(scope, id, {
      bucketName: `${Aws.ACCOUNT_ID}-${name}-database`,
      publicReadAccess: false,
      versioned: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      accessControl: BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
