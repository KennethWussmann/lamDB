import fetchEngine from '@prisma/fetch-engine';
import getPlatform from '@prisma/get-platform';
import { access, mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';

const { BinaryType, download } = fetchEngine;
type Platform = getPlatform.Platform;
type BinaryType = fetchEngine.BinaryType;

type OS = 'darwin' | 'linux';

const destination = join(process.cwd(), 'dist');
const buildDirectory = join(process.cwd(), 'build');
const engines: BinaryType[] = [BinaryType.migrationEngine, BinaryType.libqueryEngine];
const os: OS = (process.env.OS as OS) ?? 'linux';
const prismaVersion = process.env.PRISMA_VERSION ?? 'ee0282f44ff27043cee9ae3e404033e6e7ec1748';
const prismaTarget: Platform = os === 'darwin' ? 'darwin-arm64' : 'linux-arm64-openssl-3.0.x';
const enginesJsonPath = join(destination, 'engines.json');

const libExtensions: Record<OS, string> = {
  darwin: 'dylib',
  linux: 'so',
};
const libExtension = libExtensions[os];

const engineNames: Partial<Record<BinaryType, string>> = {
  [BinaryType.libqueryEngine]: 'libquery_engine',
};
const engineExtensions: Partial<Record<BinaryType, string>> = {
  [BinaryType.libqueryEngine]: `.${libExtension}.node`,
};

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
    cacheTarget.prisma.target === prismaTarget &&
    engines.every((engine) => cacheTarget.prisma.engines.includes(engine)) &&
    cacheTarget.prisma.version === prismaVersion
  );
};

const downloadPrisma = async () => {
  console.log('Downloading prisma engines', { prismaVersion, engines, prismaTarget });
  await download({
    binaries: Object.fromEntries(engines.map((engine) => [engine, destination])),
    version: prismaVersion,
    showProgress: true,
    printVersion: true,
    binaryTargets: [prismaTarget],
  });
  console.log('Renaming binaries');
  await Promise.all(
    engines.map(async (engine) => {
      await rename(
        join(
          destination,
          `${engineNames[engine] ?? engine}-${prismaTarget}${engineExtensions[engine] ? engineExtensions[engine] : ''}`,
        ),
        join(destination, `${engine}${engine === BinaryType.libqueryEngine ? '.node' : ''}`),
      );
    }),
  );
};

const build = async () => {
  if (await exists(buildDirectory)) {
    await rm(buildDirectory, {
      recursive: true,
    });
  }
  await mkdir(buildDirectory);

  if (await exists(destination)) {
    if (!(await isCacheCompatible())) {
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

  await downloadPrisma();

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
