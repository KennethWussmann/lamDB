# Packages

LamDB uses a monorepo to easily share code between components and publish them all at once.
Some of the packages are internally, some can be used to launch a lamDB instance. Here is a summary of what packages exist and how they are used.

```mermaid
graph
    Lambda[<b>lambda</b><br/><hr/><small><i>AWS specific code to run lamDB on AWS Lambda<i/></small>] --> Core[<b>core</b><br/><hr/><small><i>bridge code to Prisma engines & utils<i/></small>]
    Server[<b>server</b><br/><hr/><small><i>Express app to run lamDB standalone in Docker<i/></small>] --> Core
    Infrastructure[<b>infrastructure</b><br/><hr/><small><i>CDK library to deploy lamDB to AWS<i/></small>] --> Lambda
    APIRouter[<b>api-router</b><br/><hr/><small><i>Express router to abstract API behaviour<i/></small>] --> Core
    Lambda --> APIRouter
    Server --> APIRouter
    Core --> EngineLayer[<b>engine-layer</b><br/><hr/><small><i>Helper to download Prisma engines<i/></small>]
    Infrastructure --> EngineLayer
    Server --> EngineLayer
    Benchmark[<b>benchmark</b><br/><hr/><small><i>k6 scripts to benchmark performance<i/></small>]
    Example[<b>example</b><br/><hr/><small><i>Example CDK project using lamDB<i/></small>] --> Infrastructure
```

As you can see by the `example` package, the only real dependency one should use is the `@lamdb/infrastructure` package. It comes with everything required to deploy lamDB to AWS.

One could also use `@lamdb/server` in case they want a standalone server instance of lamDB outside AWS.

Every other package is just there to simplify the interactions and streamline communication.

Find more relevant information in the respective READMEs of the packages.
