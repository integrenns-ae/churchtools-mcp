import type { QueryParams, QueryValue } from "../types.js";

export function compactQuery(input: QueryParams): QueryParams {
  const output: QueryParams = {};

  for (const [key, value] of Object.entries(input)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value) && value.length === 0) {
      continue;
    }

    output[key] = value;
  }

  return output;
}

export function compactBody(input: Record<string, unknown>): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value;
    }
  }

  return output;
}

export function hasAtLeastOneDefinedValue(input: Record<string, unknown>): boolean {
  return Object.values(input).some((value) => value !== undefined);
}

export function appendQueryString(url: string, query?: QueryParams): string {
  if (!query) {
    return url;
  }

  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(compactQuery(query))) {
    appendQueryParam(params, key, value);
  }

  const queryString = params.toString();
  if (!queryString) {
    return url;
  }

  return `${url}${url.includes("?") ? "&" : "?"}${queryString}`;
}

function appendQueryParam(params: URLSearchParams, key: string, value: QueryValue): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      params.append(key, String(item));
    }
    return;
  }

  params.append(key, String(value));
}

export function fillPathParams(path: string, pathParams: Record<string, unknown> = {}): string {
  return path.replace(/\{([^}]+)\}/g, (_, key: string) => {
    const value = pathParams[key];
    if (value === undefined || value === null || value === "") {
      throw new Error(`Missing required path parameter: ${key}`);
    }
    return encodeURIComponent(String(value));
  });
}

export function asObject(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

export function unwrapChurchToolsData(value: unknown): unknown {
  const objectValue = asObject(value);
  if (objectValue && "data" in objectValue) {
    return objectValue.data;
  }
  return value;
}

export function extractArray(value: unknown): unknown[] {
  const unwrapped = unwrapChurchToolsData(value);
  if (Array.isArray(unwrapped)) {
    return unwrapped;
  }

  const nested = asObject(unwrapped);
  if (nested && Array.isArray(nested.data)) {
    return nested.data;
  }

  return [];
}

export function extractObject(value: unknown): Record<string, unknown> {
  const unwrapped = unwrapChurchToolsData(value);
  return asObject(unwrapped) ?? {};
}
