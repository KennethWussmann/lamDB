import { FileAdapter } from './fileAdapter';
import { LitestreamService } from './litestreamService';

export const litestreamReplicaFileAdapter: (litestreamService: LitestreamService) => FileAdapter = (
  litestreamService: LitestreamService,
) => ({
  download: async () => {
    await litestreamService.replicate();
  },
  upload: async () => {
    // no op, replicator will upload
  },
});

export const litestreamRestoreFileAdapter: (litestreamService: LitestreamService) => FileAdapter = (
  litestreamService: LitestreamService,
) => ({
  download: async () => {
    await litestreamService.restore();
  },
  upload: async () => {
    // no op, don't overwrite newer remote files
  },
});
