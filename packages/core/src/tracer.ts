import { Tracer } from '@aws-lambda-powertools/tracer';

export const tracer = new Tracer({
  serviceName: 'LamDB',
  enabled: process.env.ENABLE_TRACING?.toLowerCase() === 'true',
});

type CaptureMethodParams<T> = {
  segmentName: string;
  method: () => T;
  captureResponse?: boolean;
};

export const captureMethodSync = <T>({ segmentName, method, captureResponse = false }: CaptureMethodParams<T>): T => {
  const segment = tracer.getSegment();
  const subsegment = segment.addNewSubsegment(segmentName.startsWith('#') ? segmentName : `### ${segmentName}`);
  tracer.setSegment(subsegment);
  tracer.addServiceNameAnnotation();

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
}: CaptureMethodParams<Promise<T>>): Promise<T> => {
  const segment = tracer.getSegment();
  const subsegment = segment.addNewSubsegment(segmentName.startsWith('#') ? segmentName : `### ${segmentName}`);
  tracer.setSegment(subsegment);
  tracer.addServiceNameAnnotation();

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
