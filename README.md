<div align="center">
  <h1><code>lamDB</code></h1>

  <p>
    <strong>Pay as you go true serverless relational database using SQLite on Lambda</strong>
  </p>
</div>

## Features

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

Deploying lamDB is done in 3 easy steps. Read the [getting started guide](docs/getting-started.md).

Not sure if this is the right for you? Check the [FAQ](docs/faq.md)

## Honourable mentions

Thanks to the following related projects:

- [Prisma](https://www.prisma.io/): LamDB is using large parts of their internal APIs, engines and packages to make lamDB even possible
- [wundergraph/wunderbase](https://github.com/wundergraph/wunderbase): LamDB is largely inspired by the concept of using Prisma's tools

Please don't contact the Prisma team with any issues related to lamDB. Consider opening an issue in lamDB if you need help.
