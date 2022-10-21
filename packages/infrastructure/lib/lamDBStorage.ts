import { Aws, RemovalPolicy } from 'aws-cdk-lib';
import { Bucket, BucketAccessControl } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export class LamDBStorage extends Bucket {
  constructor(scope: Construct, id: string, name: string) {
    super(scope, id, {
      bucketName: `${Aws.ACCOUNT_ID}-${name}-database`,
      publicReadAccess: false,
      versioned: true,
      accessControl: BucketAccessControl.PRIVATE,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });
  }
}
