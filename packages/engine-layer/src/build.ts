import { BinaryType, download } from '@prisma/fetch-engine';
import { Platform } from '@prisma/get-platform';
import { access, mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const destination = join(process.cwd(), 'dist');
const engines: BinaryType[] = [BinaryType.queryEngine, BinaryType.migrationEngine];
const target: Platform = (process.env.TARGET as Platform) ?? 'linux-arm64-openssl-3.0.x';
const version = process.env.VERSION ?? 'ee0282f44ff27043cee9ae3e404033e6e7ec1748';
const enginesJsonPath = join(destination, 'engines.json');

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const isCacheCompatible = async () => {
  if (!(await exists(enginesJsonPath))) {
    return false;
  }
  const cacheTarget = JSON.parse(await readFile(enginesJsonPath, 'utf8'));
  return (
    cacheTarget.target === target &&
    engines.every((engine) => cacheTarget.engines.includes(engine)) &&
    version === cacheTarget.version
  );
};

const build = async () => {
  if (await exists(destination)) {
    if (!(await isCacheCompatible())) {
      console.log('Removing ./dist because downloaded binary is not compatible with selected target', target);
      await rm(destination, {
        recursive: true,
      });
      await mkdir(destination);
    } else {
      console.log('Using cached binaries', { version, engines, target });
      return;
    }
  } else {
    await mkdir(destination);
  }
  console.log('Downloading engines', { version, engines, target });
  await download({
    binaries: Object.fromEntries(engines.map((engine) => [engine, destination])),
    version,
    showProgress: true,
    printVersion: true,
    binaryTargets: [target],
  });
  console.log('Renaming binaries');
  await Promise.all(
    engines.map(async (engine) => {
      await rename(join(destination, `${engine}-${target}`), join(destination, `${engine}`));
    }),
  );
  console.log('Writing engines.json file');
  await writeFile(
    enginesJsonPath,
    JSON.stringify({
      engines,
      target,
      version: version ?? null,
    }),
  );
  console.log('Done');
};

build().catch(console.error);
