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
- **GraphQL API:** Easily accessible from any programming language and platform
- **True serverless:** Pay-as-you-go and scaling with your needs
- **Docker image:** Great for integration tests, run lamDB in a Docker container
- **Made for AWS:** Leveraging all benefits of AWS, simple deployment using CDK
- **Made with Prisma:** LamDB uses Prisma's query and migration engine to provide the API

## FAQ

### Whom is this for?

The applications can be versatile. It is designed for high read demand and lower write throughput.

It's not desgined to replace your DynamoDB (in most cases), but rather to extend your serverless options. LamDB can be a perfect serverless search engine, for example. Just mirror searchable content from DynamoDB to lamDB for complex queries and fulltext search.

TODO: Add a pricing example of Algolia vs lamDB. Maybe even a formula for lamDB price per request.

Given how Lambda works there are cold starts, where the database may need to be downloaded to the instance. Due to the single writer you may experience throttling in high throughput times. That's sadly a limitation that is hard to get around.

The database size is also important to monitor. As the file grows cold-starts are getting longer.
Databases up to 800 MB should still be fine.

Hence the limitations, it's great for read intensive applications with lower write throughput and known database size.

### Can I run lamDB outside AWS Lambda?

Yes, using the docker image you are able to deploy lamDB anywhere where you can run docker containers.
The docker image is designed to run locally for integration tests, but there is no reason not to run it elsewhere otherwise.
It's also a great serverful database option when you want a GraphQL API for your database.

### Is it production-ready?

If you keep the limitations in mind, yes. LamDB uses Prisma, Litestream and AWS - software that is already very well production ready and battle tested. LamDB is actually only some glue code with little caching and retry logic.

### How does auto-scaling work?

Just like AWS lambda, because it's running on it. The default setup is using single-writer, multi-reader.
Means the default configuration is designed for high read demand and lower writer throughput. That's to avoid merge conflicts with the SQLite database when multiple lambda instances want to write to the database.

You don't need to worry about redirecting your writes or reads to a certain instance. The writer and readers are conveniently behind an extra proxy endpoint that takes care of routing reads and writes to the correct destination. It also takes care of write throttling.

### How can I access the database?

LamDB exposes a dynamic GraphQL API based on your database schema. The API is provided by a subprocess of Prisma's query engine running in the background.
So you may not be able to use your favorite ORM out of the box, but actually you don't really need one - the GraphQL API is enough.

### How is the database secured?

By default it's running behind an API Gateway secured by IAM auth. Means you need to do IAM signed requests to use the API.
But API Gateway is flexible and can be configured from Cognito to API keys or no auth at all however you prefer.

The docker image does not come with any authentication. Just add an API Gateway (Kong, Traefik, caddy, nginx, etc.) of your choice in front of it.

### Single-writer, are writes throttled?

Yes, when the writer is busy, write requests will be retried for a configurable amount of time.
