import { z } from "zod";

export const ResponseFormatSchema = z.enum(["markdown", "json"]).default("markdown");

export const PageSchema = z.number().int().min(1).default(1).describe("One-based page number.");
export const LimitSchema = z.number().int().min(1).max(100).default(20).describe("Maximum results to return.");
export const OptionalIntArraySchema = z.array(z.number().int()).optional();
export const OptionalStringArraySchema = z.array(z.string()).optional();

export const QueryRecordSchema = z
  .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()]))]))
  .default({})
  .describe("Query parameters to send to ChurchTools.");

export const PathParamsSchema = z
  .record(z.union([z.string(), z.number(), z.boolean()]))
  .default({})
  .describe("Values for path placeholders such as {personId}.");

export const UnknownBodySchema = z.unknown().optional().describe("JSON request body to send to ChurchTools.");
