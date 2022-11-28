FROM node:18 AS builder

WORKDIR /app

ARG NPM_TOKEN
ENV NPM_TOKEN=${NPM_TOKEN}

COPY . .

RUN npm ci
RUN npm run build

RUN mkdir -p /data/engines
RUN mkdir -p /data/prisma
RUN mkdir -p /data/database

FROM node:18
LABEL org.opencontainers.image.source https://github.com/KennethWussmann/lamDB

WORKDIR /app
EXPOSE 4000

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

COPY --from=builder /app/packages/server/build ./
COPY --from=builder /app/packages/engine-layer/dist /data/engines
COPY --from=builder /data /

ENV ALLOW_CORS=${ALLOW_CORS:-true}
ENV MIGRATION_ENGINE_BINARY_PATH=${MIGRATION_ENGINE_BINARY_PATH:-/data/engines/migration-engine}
ENV QUERY_ENGINE_LIBRARY_PATH=${QUERY_ENGINE_LIBRARY_PATH:-/data/engines/libquery-engine.node}
ENV DATABASE_PATH=${DATABASE_PATH:-/data/database/database.db}
ENV PRISMA_SCHEMA_PATH=${PRISMA_SCHEMA_PATH:-/data/prisma/schema.prisma}

CMD ["index.js"]