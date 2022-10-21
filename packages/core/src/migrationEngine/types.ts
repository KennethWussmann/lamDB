type MigrationRequestParams = {
  force: boolean;
  schema: string;
};

export type MigrationRequest = {
  id: number;
  jsonrpc: string;
  method: string;
  params: MigrationRequestParams;
};

export type MigrationResponse = {
  jsonrpc: string;
  result?: MigrationResponseResult;
  error?: MigrationResponseError;
};

type MigrationResponseResult = {
  executedSteps: number;
};

type MigrationResponseError = {
  code: number;
  message: string;
  data: MigrationResponseErrorData;
};

type MigrationResponseErrorData = {
  is_panic: boolean;
  message: string;
  meta: MigrationResponseErrorDataMeta;
};

type MigrationResponseErrorDataMeta = {
  full_error: string;
};
