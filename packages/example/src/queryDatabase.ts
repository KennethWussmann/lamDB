import { S3 } from '@aws-sdk/client-s3';
import { PrismaClient } from '@prisma/client';
import { createReadStream, createWriteStream } from 'fs';
import { access } from 'fs/promises';
import { Readable } from 'stream';

const bucketName = process.env.DATABASE_STORAGE_BUCKET_NAME;
const s3 = new S3({});
const objectKey = 'database.db';
const destination = '/tmp/database.db';

const downloadDatabaseFile = async (): Promise<boolean> => {
  let responseBody: Readable | undefined;
  try {
    const response = await s3.getObject({
      Bucket: bucketName,
      Key: objectKey,
    });
    if (!(response.Body instanceof Readable)) {
      throw new Error('Cannot return object of non readable type');
    }
    responseBody = response.Body;
  } catch (e) {
    console.warn(e);
  }
  if (!responseBody) {
    return false;
  }
  return await new Promise((resolve, reject) => {
    if (!responseBody) {
      resolve(false);
      return;
    }
    const destinationStream = createWriteStream(destination);
    responseBody
      .pipe(destinationStream)
      .on('error', (err) => reject(err))
      .on('close', () => resolve(true));
  });
};

const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch (e) {
    return false;
  }
};
const uploadDatabaseFile = async () => {
  if (!(await fileExists(destination))) {
    return false;
  }
  const file = createReadStream(destination);
  await s3.putObject({
    Bucket: bucketName,
    Key: objectKey,
    Body: file,
  });
  return true;
};

const listAndCreateUsers = async () => {
  console.log('Querying db');
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
  const userIds: { id: number }[] = await prisma.user.findMany({
    select: { id: true },
  });
  console.log('Existing user count:', userIds.length);
  console.log('Existing users:', JSON.stringify(userIds));
  const user = await prisma.user.create({
    data: { name: 'Alice', email: 'alice@example.com' },
  });
  console.log('Created new user', user);
  await prisma.$disconnect();
  console.log('Disconnected from db');
};

export const queryDatabase = async () => {
  const downloadSuccessful = await downloadDatabaseFile();

  if (downloadSuccessful) {
    console.log('Existing database was downloaded');
  } else {
    console.log('No existing database found');
  }

  await listAndCreateUsers();

  const uploadSuccessful = await uploadDatabaseFile();
  if (uploadSuccessful) {
    console.log('Database was uploaded');
  } else {
    console.warn('No database to upload found');
  }
};
