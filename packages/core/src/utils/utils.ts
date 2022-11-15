export const getDatabaseUrl = (databaseFilePath: string) => `file:${databaseFilePath}?pool_timeout=3&connection_limit=1`;
