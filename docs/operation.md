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

#### Reset

The migration lambda offers additional parameters that can be used to reset the entire database. Effectively removing all database files on the filesystem.

```shell
aws lambda invoke --cli-binary-format raw-in-base64-out --payload '{"reset": true}' --function-name <LAMDB_NAME>-migrate --log-type Tail /dev/null --output json --query 'LogResult' | tr -d '\"' | base64 -d
```

Other options for the payload:

- `reset` - `boolean` (default: `false`): Remove database files before migration
- `migrate` - `boolean` (default: `true`): Apply migrations

They can all be combined.

### Docker

The Docker image will automatically apply migrations on startup. A restart would be enough.

Alternatively it also exposes an API endpoint to execute migrations:

```shell
curl --request POST --url http://localhost:4000/migrate

# Returns
{ success: true, data: { appliedMigrations: ['migration_a.sql', 'migration_b.sql'] } }
```

## Backup

Backing up lamDB is as easy as it can get on AWS. When enabled AWS DataSync will be used to periodically upload database files from the EFS to S3. The S3 bucket is versioned to keep track of file changes. You can later download any version of the database needed.

A lamDB file system usually contains the following files:

- `database.db` - The actual database file
- `database.db-shm` - [Temporary file by SQLite WAL](https://www.sqlite.org/tempfiles.html)
- `database.db-wal` - [Temporary file by SQLite WAL](https://www.sqlite.org/tempfiles.html)

1. Enable S3 sync

```typescript
new LamDB(this, 'MyLamDB', {
  // ...
  // Add the following setting to your existing lamDB
  efs: {
    // If the default settings are fine, just true is enough
    //s3Sync: true,
    // But we can specify more settings
    s3Sync: {
      // By default it's syncing hourly, let's define daily
      scheduleExpression: Schedule.rate(Duration.days(1)),
    },
  },
});
```

2. Deploy the changes. DataSync will now upload files to the S3 bucket `s3://<ACCOUNT-ID>-<LAMDB-INSTANCE-NAME>-database/efs`

> S3 Sync is disabled by default, because it adds complexity for simple setups and of course also adds costs.
> By using S3 LifecycleRules the data retention can be tweaked further to avoid too many versions being preserved.

## Restore a backup

Given that we have the database files backed up and ready for restore in the S3 bucket of our lamDB instance.

> Please ensure no new data is written to the database, while restoring a backup, to avoid data-loss.

1. Enable the bastion host for your lamDB instance:

```typescript
new LamDB(this, 'MyLamDB', {
  // ...
  // Add the following setting to your existing lamDB
  efs: {
    bastionHost: true,
  },
});
```

2. Deploy the changes
3. [Connect to the newly deployed EC2 instance using the AWS Console](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/session-manager.html)

On the bastion host just execute the AWS CLI command to sync the databases files from the S3 bucket to the mounted EFS.

```shell
sudo aws s3 sync s3://<ACCOUNT-ID>-<LAMDB-INSTANCE-NAME>-database mnt/<LAMDB-INSTANCE-NAME>-efs/lambda/
```

You may need to adjust the file permissions afterwards to ensure the ec2-user has read and write permission again.

## Monitoring

### Metrics

LamDB writes CloudWatch metrics for important performance and health measures. It does not define alarms by default. This is recommended to do based on the connected application and access patterns.

<table>
  <tr>
    <th>Metric name</th>
    <th>Description</th>
  </tr>
  <tr>
    <td>ReadOperations</td>
    <td>Number of successfully executed read operations</td>
  </tr>
  <tr>
    <td>WriteOperations</td>
    <td>Number of successfully executed write operations</td>
  </tr>
  <tr>
    <td>ReadThroughput</td>
    <td>Response body size in bytes for successful read operations</td>
  </tr>
  <tr>
    <td>WriteThroughput</td>
    <td>Response body size in bytes for successful write operations</td>
  </tr>
  <tr>
    <td>ReadLatency</td>
    <td>Response time of the query engine in milliseconds for successful read operations</td>
  </tr>
  <tr>
    <td>WriteLatency</td>
    <td>Response time of the query engine in milliseconds for successful write operations</td>
  </tr>
  <tr>
    <td>OperationErrors</td>
    <td>Number failed operations</td>
  </tr>
  <tr>
    <td>DatabaseSize</td>
    <td>Size of main database file in bytes</td>
  </tr>
  <tr>
    <td>MigrationsApplied</td>
    <td>Count of applied migrations</td>
  </tr>
</table>

Metrics can be used to create alarms like this:

```typescript
const lamDB = new LamDB(...);

new Alarm(this, 'DatabaseSizeAlarm', {
  // There are helper methods for all the above mentioned metrics
  metric: lamDB.metricDatabaseSize({ period: Duration.minutes(5) }),
  // Define a reasonable threshold, just an example
  threshold: 1024 * 1024 * 1024 * 10, // 10 GB
  evaluationPeriods: 1,
  alarmDescription: 'Database exceeded 10 GB in size',
});
```

Metric reporting is enabled by default. No actions needed, but they can be disabled like this:

```typescript
const lamDB = new LamDB(this, 'LamDBTest', {
  // ...
  // Metrics are enabled by default, but can be disabled
  metrics: false,
});
```

### Logging

Logs can help to investigate an issue with lamDB. By default lamDB only logs on `info` log level. For deeper analysis the debug logs may contain more helpful information. They can be enabled like this:

```typescript
const lamDB = new LamDB(this, 'LamDBTest', {
  // ...
  // trace, debug, info, warn, error or fatal
  logLevel: 'info',
});
```

### Tracing

For performance investigation it can be helpful to enable tracing. This will log traces to AWS X-Ray with important metadata and timings. Tracing is disabled by default and can be enabled like this:

```typescript
const lamDB = new LamDB(this, 'LamDBTest', {
  // ...
  tracing: true,
});
```
