import { S3 } from '@aws-sdk/client-s3';
import { createReadStream, createWriteStream } from 'fs';
import { Readable } from 'stream';
import { createLogger } from '../../logger';
import { FileAdapter } from './fileAdapter';

const logger = createLogger({ name: 'S3FileAdapter' });

export const s3FileAdapter = (bucketName: string, s3: S3 = new S3({}), objectKey = 'database.db'): FileAdapter => {
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
      } catch (e: any) {
        logger.warn('Failed to download database file from S3', { error: e?.message });
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
