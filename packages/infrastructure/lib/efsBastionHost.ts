import { Aws, Fn } from 'aws-cdk-lib';
import {
  BastionHostLinux,
  CfnInstance,
  InterfaceVpcEndpointAwsService,
  Port,
  SecurityGroup,
  UserData,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import { FileSystem } from 'aws-cdk-lib/aws-efs';
import { Construct } from 'constructs';

export type EfsBastionHostProps = {
  name: string;
  efs: FileSystem;
  vpc: Vpc;
};

export class EfsBastionHost extends Construct {
  public readonly bastionHost: BastionHostLinux;
  public readonly securityGroup: SecurityGroup;

  constructor(scope: Construct, id: string, props: EfsBastionHostProps) {
    super(scope, id);
    this.securityGroup = new SecurityGroup(this, 'BastionHostSecurityGroup', {
      securityGroupName: `${props.name}-bastion-host`,
      vpc: props.vpc,
      allowAllOutbound: true,
    });
    props.efs.connections.allowFrom(this.securityGroup, Port.tcp(2049), 'Allow NFS access from bastion host');

    // TODO: Check if the endpoints are all necessary. SSM probably but all the others?
    const endpointDefaultSecurityGroup = new SecurityGroup(this, 'LamDBVpcEndpointDefaultSecurityGroup', {
      securityGroupName: `${props.name}-vpc-endpoint-default`,
      vpc: props.vpc,
      allowAllOutbound: false,
    });
    endpointDefaultSecurityGroup.connections.allowFrom(this.securityGroup, Port.tcp(443));
    props.vpc.addInterfaceEndpoint('SSM', {
      service: InterfaceVpcEndpointAwsService.SSM,
      securityGroups: [endpointDefaultSecurityGroup],
    });
    props.vpc.addInterfaceEndpoint('EC2Messages', {
      service: InterfaceVpcEndpointAwsService.EC2_MESSAGES,
      securityGroups: [endpointDefaultSecurityGroup],
    });
    props.vpc.addInterfaceEndpoint('SSMMessages', {
      service: InterfaceVpcEndpointAwsService.SSM_MESSAGES,
      securityGroups: [endpointDefaultSecurityGroup],
    });
    this.bastionHost = new BastionHostLinux(this, 'BastionHost', {
      instanceName: `${props.name}-bastion`,
      vpc: props.vpc,
      securityGroup: this.securityGroup,
    });
    const cfnBastionHost = this.bastionHost.instance.node.defaultChild as CfnInstance;
    cfnBastionHost.userData = Fn.base64(
      UserData.custom(
        `Content-Type: multipart/mixed; boundary="//"
MIME-Version: 1.0
--//
Content-Type: text/cloud-config; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="cloud-config.txt"
#cloud-config
cloud_final_modules:
- [scripts-user, always]
--//
Content-Type: text/x-shellscript; charset="us-ascii"
MIME-Version: 1.0
Content-Transfer-Encoding: 7bit
Content-Disposition: attachment; filename="userdata.txt"
#!/bin/bash
#mount -o remount,rw,nosuid,nodev,noexec,relatime,hidepid=2 /proc
sudo yum install -y https://s3.amazonaws.com/ec2-downloads-windows/SSMAgent/latest/linux_amd64/amazon-ssm-agent.rpm
sudo systemctl enable amazon-ssm-agent
sudo systemctl start amazon-ssm-agent
sudo mkdir -p /mnt/${props.name}-efs
sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport ${props.efs.fileSystemId}.efs.${Aws.REGION}.amazonaws.com:/ /mnt/${props.name}-efs
--//`,
      ).render(),
    );
  }
}
