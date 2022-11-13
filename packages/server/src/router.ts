import { Router, json } from 'express';
import cors from 'cors';
import { LamDBService, LamDBConfiguration } from '@lamdb/core';
import { applyToExpressResponse, fromExpressRequest } from './utils';
import { errorLog } from '@lamdb/commons';

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

  router.post('/:clientVersion/:schemaHash/graphql', async (req, res) => {
    applyToExpressResponse(await service.execute(fromExpressRequest(req), 'proxy'), res);
  });

  router.post('/migrate', async (_, res) => {
    try {
      const appliedMigrations = await service.migrate();

      res.status(200);
      res.json({
        success: true,
        data: { appliedMigrations },
      });
    } catch (e) {
      res.status(500);
      res.json({
        success: false,
        data: errorLog(e),
      });
    }
  });

  return router;
};
