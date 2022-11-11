import { Tracer } from '@aws-lambda-powertools/tracer';
import { Logger } from 'winston';
import { createLogger, LogLevel } from './logger';

export const tracer = new Tracer({
  serviceName: 'LamDB',
  enabled: process.env.ENABLE_TRACING?.toLowerCase() === 'true',
});

type CaptureMethodParams<T> = {
  segmentName: string;
  method: () => T;
  captureResponse?: boolean;
  metadata?: Record<string, any>;
};

type LogTraceMethodParams<T> = CaptureMethodParams<T> & { logger?: Logger; level?: LogLevel };

const addMetadata = (metadata: Record<string, any> | undefined) => {
  if (!metadata) {
    return;
  }
  const segment = tracer.getSegment();
  Object.entries(metadata).forEach(([key, value]) => segment.addMetadata(key, value));
};

export const captureMethodSync = <T>({
  segmentName,
  method,
  captureResponse = false,
  metadata,
}: CaptureMethodParams<T>): T => {
  const segment = tracer.getSegment();
  const subsegment = segment.addNewSubsegment(segmentName.startsWith('#') ? segmentName : `### ${segmentName}`);
  tracer.setSegment(subsegment);
  tracer.addServiceNameAnnotation();
  addMetadata(metadata);

  let response;
  try {
    response = method();
    if (captureResponse) {
      tracer.addResponseAsMetadata(response);
    }
  } catch (err) {
    subsegment.addError(err as Error, false);
    throw err;
  } finally {
    subsegment.close();
    tracer.setSegment(segment);
  }

  return response;
};

export const captureMethod = async <T>({
  segmentName,
  method,
  captureResponse = false,
  metadata,
}: CaptureMethodParams<Promise<T>>): Promise<T> => {
  const segment = tracer.getSegment();
  const subsegment = segment.addNewSubsegment(segmentName.startsWith('#') ? segmentName : `### ${segmentName}`);
  tracer.setSegment(subsegment);
  tracer.addServiceNameAnnotation();
  addMetadata(metadata);

  let response;
  try {
    response = await method();
    if (captureResponse) {
      tracer.addResponseAsMetadata(response);
    }
  } catch (err) {
    subsegment.addError(err as Error, false);
    throw err;
  } finally {
    subsegment.close();
    tracer.setSegment(segment);
  }

  return response;
};

export const logTraceSync = <T>({
  segmentName,
  method,
  metadata,
  captureResponse = false,
  logger = createLogger({ name: segmentName }),
  level = 'debug',
}: LogTraceMethodParams<T>) => {
  const startTime = new Date();
  let response;
  try {
    response = method();
    if (captureResponse) {
      tracer.addResponseAsMetadata(response);
    }
  } finally {
    const endTime = new Date();
    logger.log(level, segmentName, {
      trace: {
        segmentName,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationMs: endTime.getTime() - startTime.getTime(),
        metadata,
        response: captureResponse ? response : undefined,
      },
    });
  }
  return response;
};
