import { join } from 'path';

export const binaryPath = join(__dirname, 'bin');
export const buildPath = join(binaryPath, 'build');
export const migrationEnginePath = join(binaryPath, 'migration-engine');
export const queryEnginePath = join(binaryPath, 'libquery-engine.node');

export const prismaPath = join(__dirname, 'prisma');
export const databasePath = join(prismaPath, 'database.db');
export const prismaSchemaPath = join(prismaPath, 'schema.prisma');
