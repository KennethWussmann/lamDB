import { Router, json } from 'express';
import cors from 'cors';
import { LamDBService } from './lamDBService';
import { LamDBConfiguration } from './configuration';
import { applyToExpressResponse, fromExpressRequest } from './utils';

export type RouterConfig = {
  configuration: LamDBConfiguration;
  lamDBService: LamDBService;
};

export const lamDBRouter = ({ configuration, lamDBService: service }: RouterConfig) => {
  const router = Router();

  router.use(json());
  if (configuration.server.allowCors) {
    router.use(cors());
  }

  router.post('/writer', async (req, res) => {
    applyToExpressResponse(await service.execute(fromExpressRequest(req), 'writer'), res);
  });

  router.post('/reader', async (req, res) => {
    applyToExpressResponse(await service.execute(fromExpressRequest(req), 'reader'), res);
  });

  router.post('/graphql', async (req, res) => {
    applyToExpressResponse(await service.execute(fromExpressRequest(req), 'proxy'), res);
  });

  router.post('/migrate', async (_, res) => {
    const appliedMigrations = await service.migrate(configuration.migrationEngineForceMigration);

    res.status(200);
    res.json({
      success: true,
      data: { appliedMigrations },
    });
  });

  return router;
};
