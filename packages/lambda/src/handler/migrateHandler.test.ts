let service: jest.Mocked<LamDBService>;
jest.mock('../applicationContext', () => ({
  defaultApplicationContext: { service, configuration: new LamDBConfiguration() },
}));

import { LamDBConfiguration, LamDBService } from '@lamdb/core';
import { Context } from 'aws-lambda';
import { mock } from 'jest-mock-extended';
import { MigrateHandler } from './migrateHandler';

let handler: MigrateHandler;

describe('MigrateHandler', () => {
  beforeEach(() => {
    service = mock<LamDBService>();
    handler = new MigrateHandler(service);
  });

  it('applies migrations when no payload given', async () => {
    service.migrate.mockResolvedValue(['test.sql']);

    const response = await handler.handler(undefined, {} as Context);

    expect(response).toMatchObject({
      appliedMigrations: ['test.sql'],
      migrate: true,
      reset: false,
    });
    expect(service.reset).not.toHaveBeenCalled();
    expect(service.migrate).toHaveBeenCalledWith();
  });

  it('does not apply migrations when payload sets migrate false', async () => {
    const response = await handler.handler({ migrate: false }, {} as Context);

    expect(response).toMatchObject({
      appliedMigrations: undefined,
      migrate: false,
      reset: false,
    });
    expect(service.reset).not.toHaveBeenCalled();
    expect(service.migrate).not.toHaveBeenCalled();
  });

  it('resets database when payload sets reset true', async () => {
    service.reset.mockResolvedValue(undefined);
    service.migrate.mockResolvedValue(['test.sql']);

    const response = await handler.handler({ reset: true }, {} as Context);

    expect(response).toMatchObject({
      appliedMigrations: ['test.sql'],
      migrate: true,
      reset: true,
    });
    expect(service.reset).toHaveBeenCalled();
    expect(service.migrate).toHaveBeenCalledWith();
  });
});
