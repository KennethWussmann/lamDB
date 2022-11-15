# Development

> Unless stated differently mentioned commands are to be executed from the root directory of the project.

## Setup

Development is only tested on macOS using arm64. It should work on Linux and Windows as well. Let me know if there are platform specific steps needed. Alternatively, lamDB comes with a [Devcontainer to develop inside Docker](https://code.visualstudio.com/docs/devcontainers/containers). If using the devcontainer you can skip the entire setup section and continue with building.

1. Clone repo
2. [Install Node 16](https://github.com/nvm-sh/nvm) with NPM
3. Install dependencies

```shell
npm install
```

## Building

```shell
npm run build
```

## Testing

### Unit and integration tests

```shell
npm run test
```

### Manual tests

Usually the following is really not required, but helpful if you specifically want to test something or work on the `@lamdb/server` package.

#### `@lamdb/server`

The `@lamdb/server` can run lamDB standalone.

1. Rebuild the project, with binary dependencies for your platform. Also force the rebuild to avoid caches.

```shell
DETECT_PLATFORM=1 npm run build -- --force
```

2. Create an `.env` file in `packages/server/.env` with the following content:

```shell
# The absolute file path to the @lamdb/example database file and prisma schema
DATABASE_PATH=/Users/.../lamDB/packages/example/prisma/database.db
PRISMA_SCHEMA_PATH=/Users/.../lamDB/packages/example/prisma/schema.prisma
# The absolute file path the migration engine and query engine, which we got from running the build
MIGRATION_ENGINE_BINARY_PATH=/Users/.../lamDB/packages/engine-layer/dist/migration-engine
QUERY_ENGINE_LIBRARY_PATH=/Users/.../lamDB/packages/engine-layer/dist/libquery-engine.node

# Files will be at the mentioned paths, they just need to be adjusted to your absolute file paths.
```

3. Start the server

```shell
# Switch into the server directory
cd packages/server
# Start the server (dev = auto-reload, start = no auto-reload)
npm run dev
```
