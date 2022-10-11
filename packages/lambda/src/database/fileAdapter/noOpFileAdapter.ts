import { FileAdapter } from '@lamdb/lambda';

export const noOpFileAdapater: FileAdapter = {
  download: async () => {
    //no op
  },
  upload: async () => {
    //no op
  },
};
