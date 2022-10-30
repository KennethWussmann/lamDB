import { BinaryType, buildEngines } from '@lamdb/engine-layer';
import { binaryPath, buildPath } from './binaryPaths';

module.exports = async () => {
  await buildEngines({
    destination: binaryPath,
    defaultPlatform: 'detect',
    buildDirectory: buildPath,
    engines: [BinaryType.libqueryEngine, BinaryType.migrationEngine],
  });
};
