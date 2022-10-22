import { z } from 'zod';

const rpcPrint = z.object({
  id: z.number(),
  method: z.literal('print'),
  params: z.object({
    content: z.string(),
  }),
});

const rpcMigrationResult = z.object({
  id: z.number(),
  result: z.object({
    appliedMigrationNames: z.array(z.string()),
  }),
});

const rpcError = z.object({
  error: z.object({
    code: z.number(),
    message: z.string(),
    data: z.object({
      is_panic: z.boolean(),
      message: z.string(),
      error_code: z.string(),
      meta: z.unknown().optional(),
    }),
  }),
});

export const rpcResponse = z.union([rpcPrint, rpcMigrationResult, rpcError]);

type ApplyMigrationRequestParams = {
  migrationsDirectoryPath: string;
};

type RPCPayload<T> = {
  id: number;
  jsonrpc: string;
  method: string;
  params: T;
};

export type ApplyMigrationRequest = RPCPayload<ApplyMigrationRequestParams>;
export type RPCResponse = z.infer<typeof rpcResponse>;
export type RPCError = z.infer<typeof rpcError>;
export type RPCMigrationResult = z.infer<typeof rpcMigrationResult>;

export const isRPCError = (rpcResponse: RPCResponse): rpcResponse is RPCError => !!(rpcResponse as RPCError).error;
export const isRPCMigrationResult = (rpcResponse: RPCResponse): rpcResponse is RPCMigrationResult =>
  !!(rpcResponse as RPCMigrationResult).result?.appliedMigrationNames;
