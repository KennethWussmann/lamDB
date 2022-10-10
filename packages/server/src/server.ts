import { QueryEngine } from '@lamdb/lambda';
import { Configuration } from './configuration';
import { startProxy } from './httpProxy';

const start = async (configuration: Configuration = new Configuration()) => {
  const queryEngine = new QueryEngine({
    binaryPath: configuration.queryEngineBinaryPath,
    prismaSchemaPath: configuration.prismaSchemaPath,
    databaseFilePath: configuration.databasePath,
    port: configuration.queryEnginePort,
    enablePlayground: configuration.queryEngineEnablePlayground,
    debug: configuration.queryEngineDebug,
  });

  await queryEngine.initialize(process.exit);

  startProxy(configuration, queryEngine);
};

start().catch(console.error);
