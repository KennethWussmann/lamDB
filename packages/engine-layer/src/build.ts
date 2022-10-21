import fetchEngine from '@prisma/fetch-engine';
import platform from '@prisma/get-platform';
import { access, mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const { BinaryType, download } = fetchEngine;
type Platform = platform.Platform;
type BinaryType = fetchEngine.BinaryType;

const destination = join(process.cwd(), 'dist');
const buildDirectory = join(process.cwd(), 'build');
const engines: BinaryType[] = [BinaryType.migrationEngine, BinaryType.libqueryEngine];
const enginesJsonPath = join(destination, 'engines.json');

const libExtensions: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'dylib',
  linux: 'so',
};

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const isCacheCompatible = async (target: Platform, version: string) => {
  if (!(await exists(enginesJsonPath))) {
    return false;
  }
  const cacheTarget = JSON.parse(await readFile(enginesJsonPath, 'utf8'));
  return (
    cacheTarget.prisma.target === target &&
    engines.every((engine) => cacheTarget.prisma.engines.includes(engine)) &&
    cacheTarget.prisma.version === version
  );
};

const downloadPrisma = async (target: Platform, version: string) => {
  const os = await platform.getos();
  const libExtension = libExtensions[os.platform];
  const engineNames: Partial<Record<BinaryType, string>> = {
    [BinaryType.libqueryEngine]: 'libquery_engine',
  };
  const engineExtensions: Partial<Record<BinaryType, string>> = {
    [BinaryType.libqueryEngine]: `.${libExtension}.node`,
  };
  console.log('Downloading prisma engines', { version, engines, target });
  await download({
    binaries: Object.fromEntries(engines.map((engine) => [engine, destination])),
    version: version,
    showProgress: true,
    printVersion: true,
    binaryTargets: [target],
  });
  console.log('Renaming binaries');
  await Promise.all(
    engines.map(async (engine) => {
      await rename(
        join(
          destination,
          `${engineNames[engine] ?? engine}-${target}${engineExtensions[engine] ? engineExtensions[engine] : ''}`,
        ),
        join(destination, `${engine}${engine === BinaryType.libqueryEngine ? '.node' : ''}`),
      );
    }),
  );
};

export const build = async () => {
  const prismaVersion = process.env.PRISMA_VERSION ?? 'ee0282f44ff27043cee9ae3e404033e6e7ec1748';
  const prismaTarget: Platform = process.env.DETECT_PLATFORM
    ? await platform.getPlatform()
    : 'linux-arm64-openssl-3.0.x';

  if (await exists(buildDirectory)) {
    await rm(buildDirectory, {
      recursive: true,
    });
  }
  await mkdir(buildDirectory);

  if (await exists(destination)) {
    if (!(await isCacheCompatible(prismaTarget, prismaVersion))) {
      console.log('Removing ./dist because downloaded binary is not compatible');
      await rm(destination, {
        recursive: true,
      });
      await mkdir(destination);
    } else {
      console.log('Using cached binaries', {
        prismaVersion,
        engines,
        prismaTarget,
      });
      return;
    }
  } else {
    await mkdir(destination);
  }

  await downloadPrisma(prismaTarget, prismaVersion);

  console.log('Writing engines.json file');
  await writeFile(
    enginesJsonPath,
    JSON.stringify({
      prisma: {
        engines,
        target: prismaTarget,
        version: prismaVersion ?? null,
      },
    }),
  );
  console.log('Done');
};

build().catch(console.error);
