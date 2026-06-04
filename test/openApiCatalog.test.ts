import { describe, expect, it } from "vitest";
import { OpenApiCatalog, validateCatalogInput } from "../src/services/openApiCatalog.js";

const document = {
  openapi: "3.1.0",
  paths: {
    "/persons": {
      get: {
        operationId: "get-persons",
        summary: "Get all persons",
        tags: ["Person"]
      }
    },
    "/songs/{songId}": {
      put: {
        operationId: "put-songs-songId",
        summary: "Update song",
        tags: ["Song"],
        parameters: [{ name: "songId", in: "path", required: true }],
        requestBody: { required: true }
      }
    }
  }
} as const;

describe("OpenApiCatalog", () => {
  it("indexes and searches operations", () => {
    const catalog = OpenApiCatalog.fromDocument(document);

    expect(catalog.operations).toHaveLength(2);
    expect(catalog.search("update song", 10, "write")[0]?.id).toBe("put-songs-songId");
    expect(catalog.search("persons", 10, "read")[0]?.id).toBe("get-persons");
  });

  it("builds requests from operation IDs", () => {
    const catalog = OpenApiCatalog.fromDocument(document);

    expect(
      catalog.buildRequest({
        actionId: "put-songs-songId",
        pathParams: { songId: 5 },
        body: { name: "Song", categoryId: 1 }
      })
    ).toEqual({
      method: "PUT",
      path: "/songs/5",
      body: { name: "Song", categoryId: 1 }
    });
  });

  it("validates required path params and request bodies", () => {
    const catalog = OpenApiCatalog.fromDocument(document);
    const operation = catalog.getById("put-songs-songId");
    expect(operation).toBeDefined();

    expect(() =>
      validateCatalogInput(operation!, {
        actionId: "put-songs-songId",
        body: {}
      })
    ).toThrow("songId");

    expect(() =>
      validateCatalogInput(operation!, {
        actionId: "put-songs-songId",
        pathParams: { songId: 1 }
      })
    ).toThrow("request body");
  });
});
