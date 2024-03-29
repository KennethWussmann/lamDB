import fetch from 'node-fetch';
import { BinaryType, download } from '@prisma/fetch-engine';
import { Platform, getos, getPlatform } from '@prisma/get-platform';
import { access, mkdir, readFile, rename, rm, writeFile } from 'fs/promises';
import { join } from 'path';

export { BinaryType } from '@prisma/fetch-engine';
const version = '0362da9eebca54d94c8ef5edd3b2e90af99ba452';

const libExtensions: Partial<Record<NodeJS.Platform, string>> = {
  darwin: 'dylib',
  linux: 'so',
  win32: 'dll',
};

const exists = async (file: string): Promise<boolean> => {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
};

const isCacheCompatible = async (enginesJsonPath: string, engines: BinaryType[], target: Platform, version: string) => {
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

export const getEnginePath = (destination: string, engine: BinaryType): string =>
  join(destination, `${engine}${engine === BinaryType.libqueryEngine ? '.node' : ''}`);

const downloadPrisma = async (
  destination: string,
  engines: BinaryType[],
  osPlatform: NodeJS.Platform,
  target: Platform,
  version: string,
) => {
  const libExtension = libExtensions[osPlatform];
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
        getEnginePath(destination, engine),
      );
    }),
  );
};

const getLicenseUrl = (version: string) => `https://raw.githubusercontent.com/prisma/prisma-engines/${version}/LICENSE`;

const downloadPrismaLicense = async (destination: string, version: string) => {
  const licenseUrl = getLicenseUrl(version);
  const response = await fetch(licenseUrl, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to download license');
  }

  const licenseText = await response.text();

  // ensure the license is still as expected before bundling it
  if (!licenseText.includes('Apache License') || !licenseText.includes('Version 2.0')) {
    throw new Error('Unexpected prisma-engines license');
  }

  await writeFile(join(destination, 'LICENSE'), licenseText, 'utf8');
  await writeFile(
    join(destination, 'COPYRIGHT'),
    [
      'The binary files provided in this directory are copyrighted by https://github.com/prisma/prisma-engines',
      `License text provided via LICENSE file and can be found at ${licenseUrl}`,
    ].join('\n'),
    'utf8',
  );
};

export type BuildConfig = {
  destination?: string;
  buildDirectory?: string;
  defaultVersion?: string;
  defaultPlatform?: Platform | 'detect';
  engines?: BinaryType[];
};

export const buildEngines = async ({
  destination = join(process.cwd(), 'dist'),
  buildDirectory = join(process.cwd(), 'build'),
  defaultVersion = version,
  defaultPlatform = 'linux-arm64-openssl-3.0.x',
  engines = [BinaryType.migrationEngine, BinaryType.libqueryEngine],
}: BuildConfig = {}) => {
  const prismaVersion = process.env.PRISMA_VERSION ?? defaultVersion;
  const prismaTarget: Platform =
    process.env.DETECT_PLATFORM || defaultPlatform === 'detect' ? await getPlatform() : defaultPlatform;
  const osPlatform = process.env.DETECT_PLATFORM || defaultPlatform === 'detect' ? (await getos()).platform : 'linux';
  const enginesJsonPath = join(destination, 'engines.json');

  if (await exists(destination)) {
    if (!(await isCacheCompatible(enginesJsonPath, engines, prismaTarget, prismaVersion))) {
      console.log('Removing cache because desired binary is not compatible');
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

  if (await exists(buildDirectory)) {
    console.log('Deleting existing build directory', buildDirectory);
    await rm(buildDirectory, {
      recursive: true,
    });
  }
  try {
    await mkdir(buildDirectory, { recursive: true });
  } catch {
    //
  }

  await downloadPrisma(destination, engines, osPlatform, prismaTarget, prismaVersion);
  await downloadPrismaLicense(destination, prismaVersion);

  console.log('Writing engines.json file');
  await writeFile(
    enginesJsonPath,
    JSON.stringify({
      prisma: {
        license: getLicenseUrl(prismaVersion),
        engines,
        target: prismaTarget,
        version: prismaVersion ?? null,
      },
    }),
  );
  console.log('Done');
};
