import { defaultApplicationContext } from '../applicationContext';

export const migrateHandler = async () => ({ appliedMigrations: await defaultApplicationContext.service.migrate() });
