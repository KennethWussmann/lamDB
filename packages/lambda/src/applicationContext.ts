import { LamDBConfiguration, lamDBRouter, LamDBService } from '@lamdb/api-router';
import express, { Application } from 'express';
import { logTraceSync } from '@lamdb/core';

class ApplicationContext {
  configuration = new LamDBConfiguration();
  service = new LamDBService(this.configuration);
  app: Application;

  constructor() {
    this.app = express();
    this.app.use(lamDBRouter({ configuration: this.configuration, lamDBService: this.service }));
  }
}

export const defaultApplicationContext = logTraceSync({
  segmentName: 'ApplicationContext.init',
  method: () => new ApplicationContext(),
});
