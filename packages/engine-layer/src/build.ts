import fetchEngine from '@prisma/fetch-engine';
import getPlatform from '@prisma/get-platform';
import { access, mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { $ } from 'zx';

const { BinaryType, download } = fetchEngine;
type Platform = getPlatform.Platform;
type BinaryType = fetchEngine.BinaryType;

type OS = 'darwin' | 'linux';

const destination = join(process.cwd(), 'dist');
const buildDirectory = join(process.cwd(), 'build');
const engines: BinaryType[] = [BinaryType.queryEngine, BinaryType.migrationEngine];
const os: OS = (process.env.OS as OS) ?? 'linux';
const prismaVersion = process.env.PRISMA_VERSION ?? 'ee0282f44ff27043cee9ae3e404033e6e7ec1748';
const prismaTarget: Platform = os === 'darwin' ? 'darwin' : 'linux-arm64-openssl-3.0.x';
const litestreamVersion = '0.3.9';
const litestreamTarget = os === 'darwin' ? 'darwin-amd64' : 'linux-arm64-static';
const litestreamArchiveType: 'zip' | 'tar.gz' = os === 'darwin' ? 'zip' : 'tar.gz';
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
      await rename(join(destination, `${engine}-${prismaTarget}`), join(destination, `${engine}`));
    }),
  );
};

const downloadLitestream = async () => {
  console.log('Downloading litestream', { litestreamVersion, litestreamTarget });
  const downloadUrl = `https://github.com/benbjohnson/litestream/releases/download/v${litestreamVersion}/litestream-v${litestreamVersion}-${litestreamTarget}.${litestreamArchiveType}`;
  const archivePath = join(buildDirectory, `litestream.${litestreamArchiveType}`);
  await $`curl -L ${downloadUrl} -o ${archivePath}`;

  console.log('Extracting archive');
  if (litestreamArchiveType === 'tar.gz') {
    await $`tar -xvf ${archivePath} -C ${destination}`;
  } else {
    await $`unzip ${archivePath} -d ${destination}`;
  }
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
        litestreamTarget,
        litestreamVersion,
      });
      return;
    }
  } else {
    await mkdir(destination);
  }

  await downloadPrisma();
  await downloadLitestream();

  console.log('Writing engines.json file');
  await writeFile(
    enginesJsonPath,
    JSON.stringify({
      prisma: {
        engines,
        target: prismaTarget,
        version: prismaVersion ?? null,
      },
      litestream: {
        target: litestreamTarget,
        version: litestreamVersion,
      },
    }),
  );
  console.log('Done');
};

build().catch(console.error);
