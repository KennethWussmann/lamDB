import { createLogger, QueryEngine } from '@lamdb/core';
import express, { Request, Response } from 'express';
import { Configuration } from './configuration';

const logger = createLogger({ name: 'HttpProxy' });

export const startProxy = (configuration: Configuration, queryEngine: QueryEngine) => {
  const app = express();

  app.use(express.json());

  const queryEngineProxy = async (req: Request, res: Response) => {
    const headers = Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [key, typeof value === 'string' ? value : '']),
    );
    const proxyRequest = {
      path: req.path,
      headers,
      method: req.method,
      body: req.method.toLowerCase() === 'post' ? JSON.stringify(req.body) : undefined,
    };
    try {
      const proxyResponse = await queryEngine.execute(proxyRequest);

      Object.entries(proxyResponse.headers).forEach(([key, value]) => res.setHeader(key, value));
      res.status(proxyResponse.status);
      res.send(proxyResponse.body);
    } catch (e: any) {
      res.status(400);
      res.json({
        data: null,
        errors: [
          {
            message: `Failed to proxy request: ${e?.message}`,
          },
        ],
      });
    }
  };

  app.post('/graphql', queryEngineProxy);

  const server = app.listen(configuration.proxyPort, () => {
    logger.info(`HTTP proxy running at http://localhost:${configuration.proxyPort}`);
  });

  process.on('SIGTERM', () => server.close());
  process.on('SIGINT', () => server.close());
};
