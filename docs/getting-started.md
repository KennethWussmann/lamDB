# Getting started

## Deploy

No matter how you deploy, it's very important to enable WAL mode on the SQLite afterwards.
Please [read here](operation.md#enable-wal-mode) how to do this, after initial setup.

### Using AWS

1. [Setup a TypeScript CDK project](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html)
2. Install LamDB CDK library

```shell
npm install @lamdb/infrastructure
```

3. Configure the `LamDB` CDK construct

```typescript
import { LamDB } from '@lamdb/infrastructure';
// ...
new LamDB(this, 'MyLamDB', {
  // Give a unique name to name and identify the infrastructure
  name: 'my-database',
  // Provide the path to your Prisma schema, eg.
  schemaPath: join(__dirname, '../prisma/schema.prisma'),
  // Optional: Use token based authentication and rotate token every 14 days
  apiTokens: [
    {
      name: 'developer',
      rotateAfter: Duration.days(14),
    },
  ],
});
// You can have as many LamDB instances in your stack as you like, just name them uniquely.
```

4. Deploy your CDK and be done 🎉

> ❗ Token-based auth might not be the best option. Consider using IAM auth. Never expose the LamDB API directly to users.

### Using Docker

> ❗ LamDB is meant to be used on AWS. The docker image is meant for local integration tests. It can be used in production without any warranty.

The following docker-compose is for development purposes only and should not be used like that in production!

The LamDB Docker image does not support any authentication. Please make sure your proxy takes care of that if you want to run it in production.

```YAML
services:
  lamdb:
    image: ghcr.io/kennethwussmann/lamdb:latest
    networks:
      - lamdb
    volumes:
      # Path to the directory that contains the schema.prisma & migrations/ directory
      - ./prisma:/data/prisma
      # Path to a directory where the database files will be persisted across restarts
      - ./database:/data/database
  # Optional: Expose lamDB via HTTPS. This is necessary when using @prisma/client. If not proxing through https-portal, just expose the port 4000 on lamdb directly
  https-portal:
    image: steveltn/https-portal:1
    networks:
      - lamdb
    ports:
      - "443:443"
    environment:
      STAGE: local
      DOMAINS: 'localhost -> http://lamdb:4000'
    volumes:
      - ./ssl-certs:/var/lib/https-portal

networks:
  lamdb:
```

## Connect to database

There are multiple ways to connect to a LamDB instance. The recommended one is through the official [`@prisma/client`](https://www.npmjs.com/package/@prisma/client). In case you are not using JavaScript/TypeScript, there is another option equally great.

### Using `@prisma/client`

A working example of this setup can be found in the [`example` package](../packages/example).

1. Setup Prisma and configure it to use a dataproxy as described in the [official docs](https://www.prisma.io/docs/data-platform/data-proxy)
2. Instead of their Data Platform we are going to use the same data-proxy technology to connect to our LamDB. In order to do that you only need to specify the URL of your LamDB api, that you got after deployment. You can find the URL in your API Gateway console or in the CDK deployment output. The API token was configured above and can be retrieved via SecretsManager.

```
prisma://example.execute-api.eu-central-1.amazonaws.com/?api_key={YOUR_LAMDB_API_TOKEN}
```

3. Done. Prisma will now connect to LamDB

> The `@prisma/client` works best with LamDB deployed to AWS, because that is the preferred setup, but you can very well run LamDB in Docker and still connect with the Prisma client. Just make sure your LamDB is behind an HTTPS reverse proxy as shown in above docker-compose example.

### Using plain GraphQL

In cases where you might not need much, a simple well-formed HTTP request is actually enough to communicate with the LamDB. Preferrably you can generate an SDK based on the GraphQL Schema of LamDB, you use a GraphQL library of your choice or make plain HTTP requests. Even cURL would work fine.

This is great for different ecosystems and programming languages. In almost every language good GraphQL tooling exists or at least an HTTP client.

Simple cURL example:

```shell
curl --request POST \
  --url https://example.execute-api.eu-central-1.amazonaws.com/graphql \
  --header 'Authorization: API_TOKEN' \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
  --data '{"query":"query findArticles(\n  $where: ArticleWhereInput\n) {\n  findManyArticle(\n    where: $where\n  ) {\n    id\n    url\n    title\n    subtitle\n    publication\n    claps\n  }\n}\n","variables":{"where":{"title":{"contains":"Example Article"}}},"operationName":"findArticles"}'
```

This would potentially be enough to query and mutate your LamDB, but of course can be improved by proper GraphQL tools of your choosen programming language. Here is a great [overview of GraphQL tools](https://graphql.org/code/).

### Operation Optimization

Prisma's query engine which is used internally does not support all GraphQL language features, like variables. LamDB has some feature to optimize the query to make it compatible as best as possible. This is disabled by default, because it takes significant time. Generelly it's advised to just stick with Prisma Client, it's a great ORM indeed. But if you need to use the plain GraphQL interface and want the extra language features, you can enable this optimization.

```typescript
new LamDB(this, 'MyLamDB', {
  // ...
  // Add the following setting to your existing lamDB
  operationOptimization: true,
});
```

## Migration, Backup, Restore

For more operational tasks read further in the [operation guide](operation.md).
