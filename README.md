<div align="center">
  <h1><code>lamDB</code></h1>
  <p>
    <strong>Pay as you go true serverless relational database using SQLite on AWS Lambda</strong>
  </p>
  <a href="https://codecov.io/gh/KennethWussmann/lamDB" > 
    <img src="https://codecov.io/gh/KennethWussmann/lamDB/branch/main/graph/badge.svg?token=SD1GNEEG21"/> 
  </a>
</div>

## Features

- **SQLite**: Use the power of SQLite on AWS Lambda
- **Auto-scaling:** Running on AWS Lambda and scaling like you're used to
- **Cluster:** Single-writer, multi-reader cluster by default
- **Simple backups:** S3 versioned buckets for perfect backup and restore procedures
- **True serverless:** Pay-as-you-go and scaling with your needs
- **Supports `@prisma/client`:** Use Prisma's client as if it would be any ordinary database
- **GraphQL API:** Easily accessible from any programming language and platform
- **Made with Prisma:** LamDB uses Prisma's query, migration engines and internal packages to provide the API
- **Made for AWS:** Leveraging all benefits of AWS, simple deployment using CDK
- **Docker image:** Great for integration tests, run lamDB in a Docker container

## Getting started

```typescript
// This is all what's needed to deploy a new serverless relational database using LamDB and CDK
const lamDB = new LamDB(this, 'LamDBTest', {
  // Give a unique name to name and identify the infrastructure
  name: 'lamdb-test',
  // Provide the path to your Prisma schema
  schemaPath: join(__dirname, '../prisma/schema.prisma'),
});
```

Deploying lamDB is done in 3 easy steps. Read the [getting started guide](docs/getting-started.md) or see the [full example](./packages/example/).

Not sure if this is the right for you? Check the [FAQ](docs/faq.md)

## Development

To get started with development, read the [development guide](docs/development.md).

## Honourable mentions

Thanks to the following related projects:

- [Prisma](https://www.prisma.io/): LamDB is using large parts of their internal APIs, engines and packages to make lamDB even possible
- [wundergraph/wunderbase](https://github.com/wundergraph/wunderbase): LamDB is largely inspired by the concept of using Prisma's tools

Please don't contact the Prisma team with any issues related to lamDB. Consider opening an issue in lamDB if you need help.
