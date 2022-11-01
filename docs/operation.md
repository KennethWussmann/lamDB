# Operation

To operate a lamDB instance is incredibly easy, as one is used to when using serverless infrastructure.

## Deployment

Please refer to the [getting started guide](getting-started.md).

## Enable WAL mode

To improve performace and avoid data-loss it's very important to enable the WAL mode of SQLite when operating lamDB. No matter where or how lamDB was deployed.

The easiest way to do this is to include the following statement as the very first instruction of the first migration script:

```sql
PRAGMA journal_mode=WAL;
```

You can find an example here: [Enable WAL Migration Script](../packages/example/prisma/migrations/20221022090016_configure_wal/migration.sql)

## Schema

The database schema is defined as Prisma schema.

Please refer to the offical Prisma docs about composing a database schema: [Prisma Schema](https://www.prisma.io/docs/concepts/components/prisma-schema)

## Migration

Databases changes are expressed through migration scripts. But this concept is nothing lamDB implemented. LamDB makes use of the Prisma migration procedure as much as possible.

Please refer to the official Prisma docs about writing and generating migration scripts: [Prisma Migrate](https://www.prisma.io/docs/concepts/components/prisma-migrate)

The only thing lamDB does differently is executing the migration scripts against a production database.

Using the Prisma CLI via data-proxy for that is unfortunately not supported by Prisma yet.

### AWS

This is the suggested deployment method and easy to migrate as well.

LamDB will also deploy a `migrate` Lambda function that can be invoked just after the usual application deployment.

Here is an example CLI command to execute migrations via AWS Lambda:

```shell
aws lambda invoke --function-name <LAMDB_NAME>-migrate --log-type Tail /dev/null --output json --query 'LogResult' | tr -d '\"' | base64 -d
```

The log output will show which migrations were applied.

You can find a full working example in the [example package](../packages/example).

### Docker

The Docker image will automatically apply migrations on startup. A restart would be enough.

Alternatively it also exposes an API endpoint to execute migrations:

```shell
curl --request POST --url http://localhost:4000/migrate

# Returns
{ success: true, data: { appliedMigrations: ['migration_a.sql', 'migration_b.sql'] } }
```

## Backup

Backing up lamDB is as easy as it can get on AWS.

TODO: Document how DataSync works with versioned S3 Bucket

## Restore a backup

Given that we have the database files backed up and ready for restore in the S3 bucket of our lamDB instance.

> Please ensure no new data is written to the database, while restoring a backup, to avoid data-loss.

TODO: Document enabling EC2 bastion host

On the bastion host just execute the AWS CLI command to sync the databases files from the S3 bucket to the mounted EFS.

```shell
sudo aws s3 sync s3://<ACCOUNT-ID>-<LAMDB-INSTANCE-NAME>-database /mnt/efs/lambda
```

TODO: Verify /mnt/efs/lambda path

You may need to adjust the file permissions afterwards to ensure the ec2-user has read and write permission again.
