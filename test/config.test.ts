import { describe, expect, it } from "vitest";
import { normalizeChurchToolsBaseUrl, parseConfig } from "../src/config.js";

describe("config", () => {
  it("parses required PAT configuration", () => {
    const config = parseConfig({
      CHURCHTOOLS_BASE_URL: "https://example.church.tools/api",
      CHURCHTOOLS_AUTH_MODE: "pat",
      CHURCHTOOLS_PAT: "ct-token",
      MCP_SERVER_TOKEN: "mcp-token"
    });

    expect(config.churchToolsBaseUrl).toBe("https://example.church.tools");
    expect(config.churchToolsOpenApiUrl).toBe(
      "https://example.church.tools/system/runtime/swagger/openapi.json"
    );
    expect(config.churchToolsPat).toBe("ct-token");
    expect(config.mcpServerToken).toBe("mcp-token");
  });

  it("requires an MCP server token unless unauthenticated MCP is explicitly allowed", () => {
    expect(() =>
      parseConfig({
        CHURCHTOOLS_BASE_URL: "https://example.church.tools",
        CHURCHTOOLS_AUTH_MODE: "pat",
        CHURCHTOOLS_PAT: "ct-token"
      })
    ).toThrow("MCP_SERVER_TOKEN is required");
  });

  it("names missing environment variables in startup errors", () => {
    expect(() => parseConfig({})).toThrow(
      [
        "Invalid environment:",
        "- CHURCHTOOLS_BASE_URL is required",
        "- CHURCHTOOLS_AUTH_MODE must be set to \"pat\"",
        "- CHURCHTOOLS_PAT is required"
      ].join("\n")
    );
  });

  it("normalizes ChurchTools base URLs", () => {
    expect(normalizeChurchToolsBaseUrl("https://example.church.tools/api/")).toBe(
      "https://example.church.tools"
    );
    expect(normalizeChurchToolsBaseUrl("https://example.church.tools/api")).toBe(
      "https://example.church.tools"
    );
  });
});
