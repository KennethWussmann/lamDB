import { Arn, Aws } from 'aws-cdk-lib';
import { CfnLocationEFS, CfnLocationS3, CfnTask } from 'aws-cdk-lib/aws-datasync';
import { Construct } from 'constructs';
import { LamDB } from './lamDB';

export class LamDBDataSync extends Construct {
  constructor(scope: Construct, id: string, lamDb: LamDB) {
    super(scope, id);

    const efsSource = new CfnLocationEFS(this, 'EFSLocation', {
      ec2Config: {
        subnetArn: Arn.format({
          resource: 'subnet',
          service: 'ec2',
          account: Aws.ACCOUNT_ID,
          region: Aws.REGION,
          resourceName: lamDb.fileSystem.vpc.isolatedSubnets[0].subnetId,
        }),
        securityGroupArns: [''],
      },
      efsFilesystemArn: lamDb.fileSystem.databaseStorageFileSystem.fileSystemArn,
      accessPointArn: lamDb.fileSystem.databaseStorageFileSystemAccessPoint.accessPointArn,
      inTransitEncryption: 'TLS1_2',
    });

    const s3Destination = new CfnLocationS3(this, 'S3Location', {
      s3BucketArn: lamDb.storage.bucketArn,
      s3Config: {
        bucketAccessRoleArn: '',
      },
    });

    new CfnTask(this, 'Task', {
      sourceLocationArn: efsSource.ref,
      destinationLocationArn: s3Destination.ref,
      schedule: {
        scheduleExpression: '',
      },
    });
  }
}
