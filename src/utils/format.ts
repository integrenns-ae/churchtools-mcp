import type { AppConfig } from "../config.js";
import type { ResponseFormat } from "../types.js";

export interface ToolFormatOptions {
  title: string;
  responseFormat?: ResponseFormat;
  config: Pick<AppConfig, "maxResponseBytes">;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export function formatToolResult(data: unknown, options: ToolFormatOptions): ToolResult {
  const responseFormat = options.responseFormat ?? "markdown";
  const structuredContent = ensureStructuredContent(data);
  const json = stringify(data);
  const truncatedJson = truncateText(json, options.config.maxResponseBytes);

  if (responseFormat === "json") {
    return {
      content: [{ type: "text", text: truncatedJson }],
      structuredContent
    };
  }

  return {
    content: [{ type: "text", text: `# ${options.title}\n\n\`\`\`json\n${truncatedJson}\n\`\`\`` }],
    structuredContent
  };
}

export function formatMessageResult(message: string, structuredContent?: Record<string, unknown>): ToolResult {
  return {
    content: [{ type: "text", text: message }],
    ...(structuredContent ? { structuredContent } : {})
  };
}

export function formatErrorResult(error: unknown): ToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: normalizeErrorMessage(error) }],
    structuredContent: {
      error: true,
      message: normalizeErrorMessage(error)
    }
  };
}

export function normalizeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function stringify(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function truncateText(text: string, maxBytes: number): string {
  if (Buffer.byteLength(text, "utf8") <= maxBytes) {
    return text;
  }

  const marker = "\n... truncated; add filters or lower the limit to retrieve a smaller response ...";
  const targetLength = Math.max(0, maxBytes - Buffer.byteLength(marker, "utf8"));
  let output = "";

  for (const char of text) {
    const candidate = output + char;
    if (Buffer.byteLength(candidate, "utf8") > targetLength) {
      break;
    }
    output = candidate;
  }

  return output + marker;
}

function ensureStructuredContent(data: unknown): Record<string, unknown> {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return data as Record<string, unknown>;
  }
  return { data };
}
