import { App, Duration, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Schedule } from 'aws-cdk-lib/aws-events';
import { findResourceProperties } from '../test/expect';
import { LamDBDataSync } from './lamDBDataSync';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBStorage } from './lamDBStorage';

describe('LamDBDataSync', () => {
  it('creates data sync task', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const storage = new LamDBStorage(stack, 'Storage', 'test');
    const fileSystem = new LamDBFileSystem(stack, 'FileSystem', {
      name: 'test',
      databaseStorageBucket: storage,
    });

    new LamDBDataSync(
      stack,
      'DataSync',
      {
        name: 'test',
        scheduleExpression: Schedule.rate(Duration.minutes(10)),
      },
      fileSystem,
      storage,
    );

    const template = Template.fromStack(stack);

    expect(findResourceProperties(template, 'AWS::EC2::SecurityGroup')).toMatchInlineSnapshot(`
      {
        "GroupDescription": "TestStack/FileSystem/IndexFileSystem/EfsSecurityGroup",
        "SecurityGroupEgress": [
          {
            "CidrIp": "0.0.0.0/0",
            "Description": "Allow all outbound traffic by default",
            "IpProtocol": "-1",
          },
        ],
        "Tags": [
          {
            "Key": "Name",
            "Value": "test",
          },
        ],
        "VpcId": {
          "Ref": "FileSystemVpc4D4EBA12",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::Logs::LogGroup')).toMatchInlineSnapshot(`
      {
        "LogGroupName": "/aws/datasync/lamdb/test-efs-s3-sync",
        "RetentionInDays": 14,
      }
    `);
    expect(findResourceProperties(template, 'AWS::IAM::Role')).toMatchInlineSnapshot(`
      {
        "AssumeRolePolicyDocument": {
          "Statement": [
            {
              "Action": "sts:AssumeRole",
              "Effect": "Allow",
              "Principal": {
                "Service": "datasync.amazonaws.com",
              },
            },
          ],
          "Version": "2012-10-17",
        },
        "ManagedPolicyArns": [
          {
            "Ref": "DataSyncAWSDataSyncS3BucketAccessEB55D8A7",
          },
        ],
      }
    `);
    expect(findResourceProperties(template, 'AWS::DataSync::LocationEFS')).toMatchInlineSnapshot(`
      {
        "AccessPointArn": {
          "Fn::Join": [
            "",
            [
              "arn:",
              {
                "Ref": "AWS::Partition",
              },
              ":elasticfilesystem:",
              {
                "Ref": "AWS::Region",
              },
              ":",
              {
                "Ref": "AWS::AccountId",
              },
              ":access-point/",
              {
                "Ref": "FileSystemIndexFileSystemIndexAccessPoint27B4FC5D",
              },
            ],
          ],
        },
        "Ec2Config": {
          "SecurityGroupArns": [
            {
              "Fn::Join": [
                "",
                [
                  "arn:aws:ec2:",
                  {
                    "Ref": "AWS::Region",
                  },
                  ":",
                  {
                    "Ref": "AWS::AccountId",
                  },
                  ":security-group/",
                  {
                    "Fn::GetAtt": [
                      "DataSyncEFSSecurityGroup27A51E2D",
                      "GroupId",
                    ],
                  },
                ],
              ],
            },
          ],
          "SubnetArn": {
            "Fn::Join": [
              "",
              [
                "arn:aws:ec2:",
                {
                  "Ref": "AWS::Region",
                },
                ":",
                {
                  "Ref": "AWS::AccountId",
                },
                ":subnet/",
                {
                  "Ref": "FileSystemVpcIsolatedSubnet1Subnet5CA291B4",
                },
              ],
            ],
          },
        },
        "EfsFilesystemArn": {
          "Fn::GetAtt": [
            "FileSystemIndexFileSystemC46CA2D8",
            "Arn",
          ],
        },
        "InTransitEncryption": "TLS1_2",
      }
    `);
    expect(findResourceProperties(template, 'AWS::DataSync::LocationS3')).toMatchInlineSnapshot(`
      {
        "S3BucketArn": {
          "Fn::GetAtt": [
            "Storage07F31EBC",
            "Arn",
          ],
        },
        "S3Config": {
          "BucketAccessRoleArn": {
            "Fn::GetAtt": [
              "DataSyncDataSyncRoleBF1236E8",
              "Arn",
            ],
          },
        },
        "Subdirectory": "/efs",
      }
    `);
    expect(findResourceProperties(template, 'AWS::DataSync::Task')).toMatchInlineSnapshot(`
      {
        "CloudWatchLogGroupArn": {
          "Fn::GetAtt": [
            "DataSyncDataSyncTaskLogGroup966443CC",
            "Arn",
          ],
        },
        "DestinationLocationArn": {
          "Ref": "DataSyncS3LocationD05F84A8",
        },
        "Name": "test-efs-s3-sync",
        "Options": {
          "LogLevel": "TRANSFER",
        },
        "Schedule": {
          "ScheduleExpression": "rate(10 minutes)",
        },
        "SourceLocationArn": {
          "Ref": "DataSyncEFSLocation9C15266F",
        },
      }
    `);
  });
});
