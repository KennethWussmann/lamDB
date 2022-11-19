import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Alias } from 'aws-cdk-lib/aws-kms';
import { expectResource, findResourceProperties } from '../test/expect';
import { LamDBBastionHost } from './lamDBBastionHost';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBStorage } from './lamDBStorage';

describe('LamDBBastionHost', () => {
  it('creates bastion host', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const storage = new LamDBStorage(stack, 'Storage', 'test');
    const fileSystem = new LamDBFileSystem(stack, 'FileSystem', {
      name: 'test',
      databaseStorageBucket: storage,
    });

    new LamDBBastionHost(stack, 'BastionHost', {
      name: 'test',
      efs: fileSystem.databaseStorageFileSystem,
      vpc: fileSystem.vpc,
      supportBucket: storage,
    });

    const template = Template.fromStack(stack);

    expect(findResourceProperties(template, 'AWS::EC2::SecurityGroup', 1)).toMatchInlineSnapshot(`
      {
        "GroupDescription": "TestStack/BastionHost/BastionHostSecurityGroup",
        "GroupName": "test-bastion-host",
        "SecurityGroupEgress": [
          {
            "CidrIp": "0.0.0.0/0",
            "Description": "Allow all outbound traffic by default",
            "IpProtocol": "-1",
          },
        ],
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::EC2::VPCEndpoint', 0)).toMatchInlineSnapshot(`
      {
        "RouteTableIds": [
          {
            "Ref": "FileSystemVpcPublicSubnet1RouteTableE6999ABA",
          },
          {
            "Ref": "FileSystemVpcPublicSubnet2RouteTable8429B8AF",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet1RouteTable9D65F7B9",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet2RouteTable9FE860D4",
          },
        ],
        "ServiceName": {
          "Fn::Join": [
            "",
            [
              "com.amazonaws.",
              {
                "Ref": "AWS::Region",
              },
              ".s3",
            ],
          ],
        },
        "VpcEndpointType": "Gateway",
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::EC2::VPCEndpoint', 1)).toMatchInlineSnapshot(`
      {
        "PrivateDnsEnabled": true,
        "SecurityGroupIds": [
          {
            "Fn::GetAtt": [
              "BastionHostLamDBVpcEndpointDefaultSecurityGroupCB0FF3AA",
              "GroupId",
            ],
          },
        ],
        "ServiceName": {
          "Fn::Join": [
            "",
            [
              "com.amazonaws.",
              {
                "Ref": "AWS::Region",
              },
              ".ssm",
            ],
          ],
        },
        "SubnetIds": [
          {
            "Ref": "FileSystemVpcIsolatedSubnet1Subnet5CA291B4",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet2Subnet27D15760",
          },
        ],
        "VpcEndpointType": "Interface",
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::EC2::VPCEndpoint', 2)).toMatchInlineSnapshot(`
      {
        "PrivateDnsEnabled": true,
        "SecurityGroupIds": [
          {
            "Fn::GetAtt": [
              "BastionHostLamDBVpcEndpointDefaultSecurityGroupCB0FF3AA",
              "GroupId",
            ],
          },
        ],
        "ServiceName": {
          "Fn::Join": [
            "",
            [
              "com.amazonaws.",
              {
                "Ref": "AWS::Region",
              },
              ".ssmmessages",
            ],
          ],
        },
        "SubnetIds": [
          {
            "Ref": "FileSystemVpcIsolatedSubnet1Subnet5CA291B4",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet2Subnet27D15760",
          },
        ],
        "VpcEndpointType": "Interface",
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
    expectResource(template, 'AWS::EC2::VPCEndpoint', 3);
    expect(findResourceProperties(template, 'AWS::EC2::SecurityGroup', 2)).toMatchInlineSnapshot(`
      {
        "GroupDescription": "TestStack/BastionHost/LamDBVpcEndpointDefaultSecurityGroup",
        "GroupName": "test-vpc-endpoint-default",
        "SecurityGroupEgress": [
          {
            "CidrIp": "255.255.255.255/32",
            "Description": "Disallow all traffic",
            "FromPort": 252,
            "IpProtocol": "icmp",
            "ToPort": 86,
          },
        ],
        "SecurityGroupIngress": [
          {
            "CidrIp": {
              "Fn::GetAtt": [
                "FileSystemVpc4D4EBA12",
                "CidrBlock",
              ],
            },
            "Description": {
              "Fn::Join": [
                "",
                [
                  "from ",
                  {
                    "Fn::GetAtt": [
                      "FileSystemVpc4D4EBA12",
                      "CidrBlock",
                    ],
                  },
                  ":443",
                ],
              ],
            },
            "FromPort": 443,
            "IpProtocol": "tcp",
            "ToPort": 443,
          },
        ],
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::EC2::Instance')).toMatchInlineSnapshot(`
      {
        "AvailabilityZone": {
          "Fn::Select": [
            0,
            {
              "Fn::GetAZs": "",
            },
          ],
        },
        "IamInstanceProfile": {
          "Ref": "BastionHostInstanceProfile93829602",
        },
        "ImageId": {
          "Ref": "SsmParameterValueawsserviceamiamazonlinuxlatestamzn2amihvmx8664gp2C96584B6F00A464EAD1953AFF4B05118Parameter",
        },
        "InstanceType": "t3.nano",
        "LaunchTemplate": {
          "LaunchTemplateName": "ResourceLaunchTemplate",
          "Version": {
            "Fn::GetAtt": [
              "BastionHostLaunchTemplateE89A29B6",
              "LatestVersionNumber",
            ],
          },
        },
        "SecurityGroupIds": [
          {
            "Fn::GetAtt": [
              "BastionHostBastionHostSecurityGroup988408BA",
              "GroupId",
            ],
          },
        ],
        "SubnetId": {
          "Ref": "FileSystemVpcIsolatedSubnet1Subnet5CA291B4",
        },
        "Tags": [
          {
            "Key": "Name",
            "Value": "test-bastion",
          },
        ],
        "UserData": {
          "Fn::Base64": {
            "Fn::Join": [
              "",
              [
                "Content-Type: multipart/mixed; boundary="//"
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
      sudo mkdir -p /mnt/test-efs
      sudo mount -t nfs4 -o nfsvers=4.1,rsize=1048576,wsize=1048576,hard,timeo=600,retrans=2,noresvport ",
                {
                  "Ref": "FileSystemIndexFileSystemC46CA2D8",
                },
                ".efs.",
                {
                  "Ref": "AWS::Region",
                },
                ".amazonaws.com:/ /mnt/test-efs
      --//",
              ],
            ],
          },
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::EC2::VPCEndpoint')).toMatchInlineSnapshot(`
      {
        "RouteTableIds": [
          {
            "Ref": "FileSystemVpcPublicSubnet1RouteTableE6999ABA",
          },
          {
            "Ref": "FileSystemVpcPublicSubnet2RouteTable8429B8AF",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet1RouteTable9D65F7B9",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet2RouteTable9FE860D4",
          },
        ],
        "ServiceName": {
          "Fn::Join": [
            "",
            [
              "com.amazonaws.",
              {
                "Ref": "AWS::Region",
              },
              ".s3",
            ],
          ],
        },
        "VpcEndpointType": "Gateway",
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
  });
  it('creates vpc endpoint when kms key given', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const storage = new LamDBStorage(stack, 'Storage', 'test');
    const fileSystem = new LamDBFileSystem(stack, 'FileSystem', {
      name: 'test',
      databaseStorageBucket: storage,
    });

    new LamDBBastionHost(stack, 'BastionHost', {
      name: 'test',
      efs: fileSystem.databaseStorageFileSystem,
      vpc: fileSystem.vpc,
      supportBucket: storage,
      kmsKey: Alias.fromAliasName(stack, 'KMSKey', 'custom-kms-key'),
    });

    const template = Template.fromStack(stack);

    expectResource(template, 'AWS::EC2::VPCEndpoint', 4);
    expect(findResourceProperties(template, 'AWS::EC2::VPCEndpoint', 3)).toMatchInlineSnapshot(`
      {
        "PrivateDnsEnabled": true,
        "SecurityGroupIds": [
          {
            "Fn::GetAtt": [
              "BastionHostLamDBVpcEndpointDefaultSecurityGroupCB0FF3AA",
              "GroupId",
            ],
          },
        ],
        "ServiceName": {
          "Fn::Join": [
            "",
            [
              "com.amazonaws.",
              {
                "Ref": "AWS::Region",
              },
              ".kms",
            ],
          ],
        },
        "SubnetIds": [
          {
            "Ref": "FileSystemVpcIsolatedSubnet1Subnet5CA291B4",
          },
          {
            "Ref": "FileSystemVpcIsolatedSubnet2Subnet27D15760",
          },
        ],
        "VpcEndpointType": "Interface",
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
  });
});
