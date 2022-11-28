// istanbul ignore file
import { z } from 'zod';

const headersSchema = z.record(z.string());

export const requestSchema = z.object({
  path: z.string().optional(),
  method: z.string(),
  headers: headersSchema.optional(),
  body: z.string().optional(),
});

export const responseSchema = z.object({
  status: z.number(),
  headers: headersSchema,
  body: z.string().optional(),
});

export type Request = z.infer<typeof requestSchema>;
export type Response = z.infer<typeof responseSchema>;
