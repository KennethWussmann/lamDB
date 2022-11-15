import { RemovalPolicy } from 'aws-cdk-lib';
import { GatewayVpcEndpointAwsService, Vpc } from 'aws-cdk-lib/aws-ec2';
import { AccessPoint, FileSystem } from 'aws-cdk-lib/aws-efs';
import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { LamDBBastionHost } from './lamDBBastionHost';
import { LamDBProps } from './types';
import { FileSystem as LambdaFileSystem } from 'aws-cdk-lib/aws-lambda';

export class LamDBFileSystem extends Construct {
  public readonly efsMountPath = '/mnt/efs';
  public readonly databaseStorageFileSystem: FileSystem;
  public readonly databaseStorageFileSystemAccessPoint: AccessPoint;
  public readonly lambdaFileSystem: LambdaFileSystem;
  public readonly vpc: Vpc;
  public readonly databaseStorageEfsBastionHost: LamDBBastionHost | undefined;

  constructor(scope: Construct, id: string, props: LamDBProps, databaseStorageBucket: IBucket) {
    super(scope, id);

    this.vpc = new Vpc(this, 'Vpc', {
      vpcName: `${props.name}-vpc`,
      natGateways: 0,
      maxAzs: 2,
      gatewayEndpoints: {
        s3: {
          service: GatewayVpcEndpointAwsService.S3,
        },
      },
    });

    this.databaseStorageFileSystem = new FileSystem(this, 'IndexFileSystem', {
      removalPolicy: RemovalPolicy.RETAIN,
      encrypted: true,
      fileSystemName: props.name,
      vpc: this.vpc,
    });
    this.databaseStorageFileSystemAccessPoint = this.databaseStorageFileSystem.addAccessPoint('IndexAccessPoint', {
      createAcl: {
        ownerGid: '1000',
        ownerUid: '1000',
        permissions: '750',
      },
      posixUser: {
        gid: '1000',
        uid: '1000',
      },
      path: '/lambda',
    });
    this.lambdaFileSystem = LambdaFileSystem.fromEfsAccessPoint(this.databaseStorageFileSystemAccessPoint, this.efsMountPath);

    if (typeof props.efs?.bastionHost === 'boolean' ? props.efs?.bastionHost : !!props.efs?.bastionHost) {
      this.databaseStorageEfsBastionHost = new LamDBBastionHost(this, 'EfsBastionHost', {
        name: props.name,
        vpc: this.vpc,
        efs: this.databaseStorageFileSystem,
        kmsKey: typeof props.efs?.bastionHost !== 'boolean' ? props.efs?.bastionHost?.kmsKey : undefined,
        supportBucket: databaseStorageBucket,
      });
    }
  }
}
