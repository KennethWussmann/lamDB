/**
 * Small script that uses other LamDB components to convert the schema.prisma into schema.graphql SDL.
 * This is used to allow generating an easy to use GraphQL SDK.
 */
import { BinaryType, buildEngines, getEnginePath } from '@lamdb/engine-layer';
import { getQueryEngine } from '@lamdb/core';
import { dirname, join } from 'path';
import { writeFile } from 'fs/promises';

(async () => {
  const databaseFilePath = join(__dirname, '..', 'prisma', 'database.db');
  const prismaSchemaPath = join(__dirname, '..', 'prisma', 'schema.prisma');
  const engineDestination = join(__dirname, '..', 'build');

  await buildEngines({
    destination: engineDestination,
    buildDirectory: engineDestination,
    defaultPlatform: 'detect',
    engines: [BinaryType.libqueryEngine],
  });

  const sdl = await getQueryEngine({
    libraryPath: getEnginePath(engineDestination, BinaryType.libqueryEngine),
    databaseFilePath,
    prismaSchemaPath,
  }).getSdl();

  await writeFile(join(dirname(prismaSchemaPath), 'schema.graphql'), sdl, 'utf8');
})();
