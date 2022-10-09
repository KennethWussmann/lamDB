import { S3 } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { FileAdapter } from './fileAdapter';

export const s3FileAdapter = (
  s3: S3 = new S3({}),
  bucketName: string = process.env.DATABASE_STORAGE_BUCKET_NAME ?? '',
  objectKey = 'database.db',
): FileAdapter => {
  return {
    download: async (destination: string): Promise<void> => {
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
        return;
      }
      return await new Promise((resolve, reject) => {
        if (!responseBody) {
          resolve();
          return;
        }
        const destinationStream = createWriteStream(destination);
        responseBody
          .pipe(destinationStream)
          .on('error', (err) => reject(err))
          .on('close', () => resolve());
      });
    },
    upload: async (origin: string) => {
      const file = createReadStream(origin);
      await s3.putObject({
        Bucket: bucketName,
        Key: objectKey,
        Body: file,
      });
    },
  };
};
