// explicity only export the given handler to avoid any unnecessary code being bundled, keep the bundle small and runtime short
// eslint-disable-next-line monorepo/no-internal-import
export { readerHandler, writerHandler } from '@lamdb/lambda/dist/handler/readerWriterHandler';
