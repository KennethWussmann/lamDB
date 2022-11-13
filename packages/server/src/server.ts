import { getLamDBService, LamDBConfiguration } from '@lamdb/core';
import express from 'express';
import { config } from 'dotenv';
import { lamDBRouter } from './router';
import { createLogger } from '@lamdb/commons';

config();
const logger = createLogger({ name: 'Server' });

const start = async (config = new LamDBConfiguration()) => {
  const service = getLamDBService(config);
  await service.migrate();

  const router = lamDBRouter({ configuration: config, lamDBService: service });
  const app = express();

  app.use(router);

  const server = app.listen(config.server.proxyPort, () => {
    logger.info(`Server running at http://localhost:${config.server.proxyPort}`);
  });

  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
};

start().catch(console.error);
