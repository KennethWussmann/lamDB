// istanbul ignore file
import { z } from 'zod';

export const requestSchema = z.object({
  path: z.string().optional(),
  method: z.string(),
  headers: z.record(z.string()).optional(),
  body: z.string().optional(),
});

export type Request = z.infer<typeof requestSchema>;

export type Response = {
  status: number;
  headers: Record<string, string>;
  body: string | undefined;
};
