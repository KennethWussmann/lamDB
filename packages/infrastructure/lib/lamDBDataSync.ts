import { Arn, Aws, Duration, RemovalPolicy } from 'aws-cdk-lib';
import { CfnLocationEFS, CfnLocationS3, CfnTask } from 'aws-cdk-lib/aws-datasync';
import { Port, SecurityGroup } from 'aws-cdk-lib/aws-ec2';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { Effect, ManagedPolicy, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup, RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBStorage } from './lamDBStorage';
import { LamDBDataSyncProps } from './types';

/**
 * AWS DataSync setup to sync data from EFS to S3
 */
export class LamDBDataSync extends Construct {
  constructor(scope: Construct, id: string, props: LamDBDataSyncProps & { name: string }, fileSystem: LamDBFileSystem, storage: LamDBStorage) {
    super(scope, id);
    const name = `${props.name}-efs-s3-sync`;
    const dataSyncPrincipal = new ServicePrincipal('datasync.amazonaws.com');

    const securityGroup = new SecurityGroup(this, 'EFSSecurityGroup', {
      securityGroupName: name,
      vpc: fileSystem.vpc,
      allowAllOutbound: true,
    });

    securityGroup.connections.allowTo(fileSystem.databaseStorageFileSystem, Port.tcp(2049), 'Allow NFS access from DataSync');

    const logGroup = new LogGroup(this, 'DataSyncTaskLogGroup', {
      retention: RetentionDays.TWO_WEEKS,
      logGroupName: `/aws/datasync/lamdb/${name}`,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    logGroup.addToResourcePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [dataSyncPrincipal],
        actions: ['logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: ['*'],
      }),
    );

    const role = new Role(this, 'DataSyncRole', {
      assumedBy: dataSyncPrincipal,
      managedPolicies: [
        new ManagedPolicy(this, 'AWS DataSync S3 Bucket Access', {
          statements: [
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: ['s3:GetBucketLocation', 's3:ListBucket', 's3:ListBucketMultipartUploads'],
              resources: [storage.bucketArn],
            }),
            new PolicyStatement({
              effect: Effect.ALLOW,
              actions: [
                's3:AbortMultipartUpload',
                's3:DeleteObject',
                's3:GetObject',
                's3:ListMultipartUploadParts',
                's3:PutObjectTagging',
                's3:GetObjectTagging',
                's3:PutObject',
              ],
              resources: [`${storage.bucketArn}/*`],
            }),
          ],
        }),
      ],
    });

    const efsSource = new CfnLocationEFS(this, 'EFSLocation', {
      ec2Config: {
        subnetArn: Arn.format({
          partition: 'aws',
          account: Aws.ACCOUNT_ID,
          region: Aws.REGION,
          resource: 'subnet',
          service: 'ec2',
          resourceName: fileSystem.vpc.isolatedSubnets[0].subnetId,
        }),
        securityGroupArns: [
          Arn.format({
            partition: 'aws',
            account: Aws.ACCOUNT_ID,
            region: Aws.REGION,
            resource: 'security-group',
            service: 'ec2',
            resourceName: securityGroup.securityGroupId,
          }),
        ],
      },
      efsFilesystemArn: fileSystem.databaseStorageFileSystem.fileSystemArn,
      accessPointArn: fileSystem.databaseStorageFileSystemAccessPoint.accessPointArn,
      inTransitEncryption: 'TLS1_2',
    });

    const s3Destination = new CfnLocationS3(this, 'S3Location', {
      s3BucketArn: storage.bucketArn,
      s3Config: {
        bucketAccessRoleArn: role.roleArn,
      },
      subdirectory: '/efs',
    });

    new CfnTask(this, 'Task', {
      name: name,
      sourceLocationArn: efsSource.ref,
      destinationLocationArn: s3Destination.ref,
      cloudWatchLogGroupArn: logGroup.logGroupArn,
      options: {
        logLevel: 'TRANSFER',
      },
      schedule: {
        scheduleExpression: (props.scheduleExpression ?? Schedule.rate(Duration.hours(1))).expressionString,
      },
    });
  }
}
