// explicity only export the given handler to avoid any unnecessary code being bundled, keep the bundle small and runtime short
// istanbul ignore file
// eslint-disable-next-line monorepo/no-internal-import
export { deferredHandler } from '@lamdb/lambda/dist/handler/deferredHandler';
