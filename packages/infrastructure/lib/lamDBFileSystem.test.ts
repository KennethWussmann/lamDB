/* eslint-disable jest/expect-expect */
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { expectResource, findResourceProperties } from '../test/expect';
import { LamDBFileSystem } from './lamDBFileSystem';
import { LamDBStorage } from './lamDBStorage';

describe('LamDBFileSystem', () => {
  it('creates EFS file system', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const databaseStorageBucket = new LamDBStorage(stack, 'Storage', 'test');

    new LamDBFileSystem(stack, 'FileSystem', {
      name: 'test-fs',
      databaseStorageBucket,
    });

    const template = Template.fromStack(stack);

    expect(findResourceProperties(template, 'AWS::EFS::FileSystem')).toMatchInlineSnapshot(`
      {
        "Encrypted": true,
        "FileSystemTags": [
          {
            "Key": "Name",
            "Value": "test-fs",
          },
        ],
      }
    `);
    expect(findResourceProperties(template, 'AWS::EFS::AccessPoint')).toMatchInlineSnapshot(`
      {
        "FileSystemId": {
          "Ref": "FileSystemIndexFileSystemC46CA2D8",
        },
        "PosixUser": {
          "Gid": "1000",
          "Uid": "1000",
        },
        "RootDirectory": {
          "CreationInfo": {
            "OwnerGid": "1000",
            "OwnerUid": "1000",
            "Permissions": "750",
          },
          "Path": "/lambda",
        },
      }
    `);
    expect(findResourceProperties(template, 'AWS::EC2::VPC')).toMatchInlineSnapshot(`
      {
        "CidrBlock": "10.0.0.0/16",
        "EnableDnsHostnames": true,
        "EnableDnsSupport": true,
        "InstanceTenancy": "default",
        "Tags": [
          {
            "Key": "Name",
            "Value": "test-fs-vpc",
          },
        ],
      }
    `);
  });

  it('creates bastion host if enabled', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const databaseStorageBucket = new LamDBStorage(stack, 'Storage', 'test');

    new LamDBFileSystem(stack, 'FileSystem', {
      name: 'test-fs',
      databaseStorageBucket,
      bastionHost: true,
    });

    const template = Template.fromStack(stack);

    expectResource(template, 'AWS::EC2::Instance');
  });
  it('does not create bastion host if disabled', () => {
    const app = new App();
    const stack = new Stack(app, 'TestStack');

    const databaseStorageBucket = new LamDBStorage(stack, 'Storage', 'test');

    new LamDBFileSystem(stack, 'FileSystem', {
      name: 'test-fs',
      databaseStorageBucket,
      bastionHost: false,
    });

    const template = Template.fromStack(stack);

    expectResource(template, 'AWS::EC2::Instance', 0);
  });
});
