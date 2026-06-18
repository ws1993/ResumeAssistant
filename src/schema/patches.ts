import { z } from 'zod';

const opAddSchema = z.object({
  op: z.literal('add'),
  path: z.string(),
  value: z.unknown(),
});

const opRemoveSchema = z.object({
  op: z.literal('remove'),
  path: z.string(),
});

const opReplaceSchema = z.object({
  op: z.literal('replace'),
  path: z.string(),
  value: z.unknown(),
});

const opMoveSchema = z.object({
  op: z.literal('move'),
  from: z.string(),
  path: z.string(),
});

const opCopySchema = z.object({
  op: z.literal('copy'),
  from: z.string(),
  path: z.string(),
});

const opTestSchema = z.object({
  op: z.literal('test'),
  path: z.string(),
  value: z.unknown(),
});

export const jsonPatchOpSchema = z.discriminatedUnion('op', [
  opAddSchema,
  opRemoveSchema,
  opReplaceSchema,
  opMoveSchema,
  opCopySchema,
  opTestSchema,
]);

export const rewriteResultSchema = z.object({
  operations: z.array(jsonPatchOpSchema).default([]),
  rationale: z.array(z.string()).default([]),
});

export type JsonPatchOp = z.infer<typeof jsonPatchOpSchema>;
export type RewriteResult = z.infer<typeof rewriteResultSchema>;
