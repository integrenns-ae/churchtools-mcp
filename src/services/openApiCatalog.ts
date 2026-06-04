import type { ChurchToolsRequest, HttpMethod, QueryParams } from "../types.js";
import { fillPathParams } from "../utils/object.js";

const OPENAPI_METHODS = new Set(["get", "post", "put", "patch", "delete"]);

export interface OpenApiParameter {
  name: string;
  in: "path" | "query" | "header" | "cookie";
  required?: boolean;
  description?: string;
  schema?: unknown;
}

export interface OpenApiOperation {
  operationId?: string;
  summary?: string;
  description?: string;
  tags?: string[];
  parameters?: OpenApiParameter[];
  requestBody?: unknown;
}

export interface OpenApiPathItem {
  parameters?: OpenApiParameter[];
  [method: string]: OpenApiOperation | OpenApiParameter[] | undefined;
}

export interface OpenApiDocument {
  openapi: string;
  info?: { title?: string; version?: string };
  paths: Record<string, OpenApiPathItem>;
}

export interface CatalogOperation {
  id: string;
  method: HttpMethod;
  path: string;
  summary: string;
  description: string;
  tags: string[];
  parameters: OpenApiParameter[];
  requestBody?: unknown;
  isRead: boolean;
  destructive: boolean;
  searchText: string;
}

export interface CatalogExecutionInput {
  actionId: string;
  pathParams?: Record<string, unknown>;
  query?: QueryParams;
  body?: unknown;
}

export class OpenApiCatalog {
  private readonly operationsById: Map<string, CatalogOperation>;

  private constructor(public readonly operations: CatalogOperation[]) {
    this.operationsById = new Map(operations.map((operation) => [operation.id, operation]));
  }

  static async load(url: string): Promise<OpenApiCatalog> {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    if (!response.ok) {
      throw new Error(`Unable to load ChurchTools OpenAPI document from ${url}: ${response.status}`);
    }

    return OpenApiCatalog.fromDocument((await response.json()) as OpenApiDocument);
  }

  static fromDocument(document: OpenApiDocument): OpenApiCatalog {
    const operations: CatalogOperation[] = [];

    for (const [path, pathItem] of Object.entries(document.paths ?? {})) {
      const pathParameters = Array.isArray(pathItem.parameters) ? pathItem.parameters : [];

      for (const [rawMethod, maybeOperation] of Object.entries(pathItem)) {
        if (!OPENAPI_METHODS.has(rawMethod) || !maybeOperation || Array.isArray(maybeOperation)) {
          continue;
        }

        const operation = maybeOperation as OpenApiOperation;
        const method = rawMethod.toUpperCase() as HttpMethod;
        const id = operation.operationId || fallbackOperationId(method, path);
        const parameters = [...pathParameters, ...(operation.parameters ?? [])];
        const summary = operation.summary || "";
        const description = operation.description || "";
        const tags = operation.tags ?? [];

        operations.push({
          id,
          method,
          path,
          summary,
          description,
          tags,
          parameters,
          requestBody: operation.requestBody,
          isRead: method === "GET",
          destructive: method === "DELETE",
          searchText: [id, method, path, summary, description, ...tags].join(" ").toLowerCase()
        });
      }
    }

    return new OpenApiCatalog(operations);
  }

  getById(actionId: string): CatalogOperation | undefined {
    return this.operationsById.get(actionId);
  }

  search(query: string, limit: number, mode: "all" | "read" | "write" = "all"): CatalogOperation[] {
    const normalizedQuery = query.trim().toLowerCase();
    const terms = normalizedQuery.split(/[^a-z0-9_/-]+/i).filter(Boolean);

    return this.operations
      .filter((operation) => {
        if (mode === "read") {
          return operation.isRead;
        }
        if (mode === "write") {
          return !operation.isRead;
        }
        return true;
      })
      .map((operation) => ({ operation, score: scoreOperation(operation, terms) }))
      .filter(({ score }) => terms.length === 0 || score > 0)
      .sort((a, b) => b.score - a.score || a.operation.id.localeCompare(b.operation.id))
      .slice(0, limit)
      .map(({ operation }) => operation);
  }

  buildRequest(input: CatalogExecutionInput): ChurchToolsRequest {
    const operation = this.getById(input.actionId);
    if (!operation) {
      throw new Error(`Unknown ChurchTools action: ${input.actionId}`);
    }

    validateCatalogInput(operation, input);

    return {
      method: operation.method,
      path: fillPathParams(operation.path, input.pathParams),
      query: input.query,
      ...(input.body !== undefined ? { body: input.body } : {})
    };
  }
}

export function validateCatalogInput(operation: CatalogOperation, input: CatalogExecutionInput): void {
  const pathParams = input.pathParams ?? {};
  const query = input.query ?? {};

  for (const parameter of operation.parameters) {
    if (!parameter.required) {
      continue;
    }

    if (parameter.in === "path" && !(parameter.name in pathParams)) {
      throw new Error(`Missing required path parameter '${parameter.name}' for ${operation.id}.`);
    }

    if (parameter.in === "query" && !(parameter.name in query)) {
      throw new Error(`Missing required query parameter '${parameter.name}' for ${operation.id}.`);
    }
  }

  if (operation.requestBody && operation.method !== "GET" && input.body === undefined) {
    const requestBody = operation.requestBody as { required?: boolean };
    if (requestBody.required) {
      throw new Error(`Missing required request body for ${operation.id}.`);
    }
  }
}

export function summarizeOperation(operation: CatalogOperation): Record<string, unknown> {
  return {
    id: operation.id,
    method: operation.method,
    path: operation.path,
    tags: operation.tags,
    summary: operation.summary,
    description: operation.description,
    parameters: operation.parameters.map((parameter) => ({
      name: parameter.name,
      in: parameter.in,
      required: Boolean(parameter.required),
      description: parameter.description
    })),
    requestBodyRequired: Boolean((operation.requestBody as { required?: boolean } | undefined)?.required),
    readOnly: operation.isRead,
    destructive: operation.destructive
  };
}

function fallbackOperationId(method: HttpMethod, path: string): string {
  return `${method.toLowerCase()}-${path.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function scoreOperation(operation: CatalogOperation, terms: string[]): number {
  if (terms.length === 0) {
    return 1;
  }

  let score = 0;
  const id = operation.id.toLowerCase();
  const path = operation.path.toLowerCase();
  const summary = operation.summary.toLowerCase();
  const tags = operation.tags.join(" ").toLowerCase();

  for (const term of terms) {
    if (id.includes(term)) score += 8;
    if (path.includes(term)) score += 6;
    if (summary.includes(term)) score += 4;
    if (tags.includes(term)) score += 3;
    if (operation.searchText.includes(term)) score += 1;
  }

  return score;
}
