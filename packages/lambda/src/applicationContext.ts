import { LamDBConfiguration, lamDBRouter, LamDBService } from '@lamdb/api-router';
import { Handler } from 'aws-lambda';
import express, { Application } from 'express';
import serverlessExpress from '@vendia/serverless-express';
import { logTraceSync } from '@lamdb/core';

class ApplicationContext {
  configuration = new LamDBConfiguration();
  service = new LamDBService(this.configuration);
  app: Application;

  serverlessExpressHandler: Handler;

  constructor() {
    this.app = express();
    this.app.use(lamDBRouter({ configuration: this.configuration, lamDBService: this.service }));

    this.serverlessExpressHandler = serverlessExpress({
      app: this.app,
    });
  }
}

export const defaultApplicationContext = logTraceSync({
  segmentName: 'ApplicationContext.init',
  method: () => new ApplicationContext(),
});
