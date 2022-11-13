import { LamDBConfiguration, LamDBService } from '@lamdb/core';
import { logTraceSync } from '@lamdb/commons';

class ApplicationContext {
  configuration = new LamDBConfiguration();
  service = new LamDBService(this.configuration);
}

export const defaultApplicationContext = logTraceSync({
  segmentName: 'ApplicationContext.init',
  method: () => new ApplicationContext(),
});
