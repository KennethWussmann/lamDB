# FAQ

## Whom is this for?

The applications can be versatile. It is designed for high read demand and lower write throughput.

It's not desgined to replace your DynamoDB (in most cases), but rather to extend your serverless options. LamDB can be a perfect serverless search engine, for example. Just mirror searchable content from DynamoDB to lamDB for complex queries and fulltext search.

Due to the single writer you may experience throttling in high throughput times. That's sadly a limitation that is hard to get around.

Hence the limitations, it's great for read intensive applications where the one second cold-start does not hurt with lower write throughput and known database size.

Read more about the [motivation behind lamDB](./motivation.md).

## What does lamDB cost to run?

Lets compare some different managed database options. Notice that these are at best rough estimates, especially with lamDB where it also depends on network traffic. Also all these providers offer a magnitude of different features, performance and quality and should rather give you a rough idea where you stand when choosing lamDB.

Given a database with 10,000 records and 10,000 requests total:

<table>
  <tr>
    <th>Provider</th>
    <th>Estimated price per month</th>
  </tr>
  <tr>
    <td>LamDB</td>
    <td><a href="https://calculator.aws/#/estimate?id=d6594b8f2759a8d6227653535c8a669b05c8b44f">$ 3</a></td>
  </tr>
  <tr>
    <td>Algolia</td>
    <td><a href="https://www.algolia.com/pricing/">$ 10</a></td>
  </tr>
  <tr>
    <td>ElasticSearch Cloud on AWS</td>
    <td><a href="https://cloud.elastic.co/pricing?elektra=pricing-page">$ 27</a></td>
  </tr>
</table>

> <small>Not comparing any self-hosted options, because they cannot compete with a serverless/managed service in terms of availability and maintenance.</small>

## Can I run lamDB outside AWS Lambda?

Yes, using the docker image you are able to deploy lamDB anywhere where you can run docker containers.
The docker image is designed to run locally for integration tests, but there is no reason not to run it elsewhere otherwise.
It's also a great serverful database option when you want a GraphQL API for your database.

## Is it production-ready?

If you keep the limitations in mind, yes. LamDB uses Prisma and AWS - software that is already very well production ready and battle tested. LamDB is actually only some glue code with little caching and retry logic.

## How does auto-scaling work?

Just like AWS lambda, because it's running on it. The default setup is using single-writer, multi-reader.
Means the default configuration is designed for read demand and lower writer throughput. That's to avoid merge conflicts with the SQLite database when multiple lambda instances want to write to the database.

You don't need to worry about redirecting your writes or reads to a certain instance. The writer and readers are conveniently behind an extra proxy endpoint that takes care of routing reads and writes to the correct destination. It also takes care of write throttling.

## How can I access the database?

LamDB exposes a dynamic GraphQL API based on your database schema. The API is provided by a subprocess of Prisma's query engine running in the background.
As lamDB uses Prisma's own query engine you can just use Prisma client as your ORM, but actually you don't really need an ORM - the GraphQL API is enough.

Read more about connecting to the database in the [getting started guide](getting-started.md).

## How is the database secured?

By default it's not secured and publicly accessible via API Gateway.
But API Gateway is flexible and can be configured from IAM auth (recommended), Cognito to API tokens.
It's not advised to keep the database publicly accessible. If you are unsure and just testing, the API tokens are a good start though.

The docker image does not come with any authentication. Just add an API Gateway (Kong, Traefik, caddy, nginx, etc.) of your choice in front of it.

## Single-writer, are writes throttled?

Yes, when the writer is busy, write requests will be retried. Once they reach the maximum retry count the request will fail.

## How can I improve response times?

Given how Lambda works there are cold starts, where the code needs to be initialized and connections needs to be established. The base cold start time of [JavaScript lambdas is around 400 ms](https://mikhail.io/serverless/coldstarts/aws/). There is no way of getting quicker than that. LamDB Lambdas are around 700 kB big and require some initialization of the Prisma Query Engine. Therefore the cold start with a small response is currently around 1.5 seconds. Warm instances respond in 50 - 80 ms, also depends on the response size of course.

### Use the reader and writer directly

The proxy `/graphql` endpoint is helpful to deal with throttles, but of course also adds up in the response times because it needs to also proxy traffic to the readers and writer.
Usually discouraged, but you can of course also request the `/reader` and `/writer` directly. You then need to take care to only send read requests to readers and write requests only to the writer.
Also keep in mind that there is only one writer. If it is busy currently, you'll get a 503 by API Gateway.

You could even invoke the corresponding Lambdas directly to rule out API Gateway completely. This is also helpful for the opposite case, when you want to run long running operations.

### Provisioned concurrency

By defining provisioned concurrency, cold starts can be improved and latency reduced. This will cost more, but can help to improve performance in certain scenarios and request patterns. [This blog post can help](https://aws.amazon.com/fr/blogs/compute/creating-low-latency-high-volume-apis-with-provisioned-concurrency/) to investigate and improve performance using provisioned concurrency. Provisioned concurrency is very expensive, at this point, rather consider another database technology.

This can be done via CDK like this:

```typescript
new LamDB(
  // ...
  // extend config by provisionedConcurreny. Choose what ever is reasonable to your application.
  // Proxy, Reader, Writer can be configured individually and none of them are mandatory
  lambda: {
    provisionedConcurreny: {
      // It makes sense to keep the proxy and reader setting the same
      proxy: 1,
      reader: 1,
      // You cannot go higher than 1.
      writer: 1,
    },
  },
);
```

### Notes on database size and memory

A smaller database file can improve performance. Also check this [blog post with tips to improve SQLite performance](https://phiresky.github.io/blog/2020/sqlite-performance-tuning/).

Assigning more memory will increase costs, but also CPU which is helpful when communicating with the database. Tests show that more memory will not improve the init phase of a Lambda and therefore don't really improve cold starts in general for lamDB either.
