// explicity only export the given handler to avoid any unnecessary code being bundled, keep the bundle small and runtime short
export { readerHandler, writerHandler } from '@lamdb/lambda/dist/lambda/src/handler/readerWriterHandler';
