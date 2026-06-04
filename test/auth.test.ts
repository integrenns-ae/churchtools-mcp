import { describe, expect, it } from "vitest";
import { isAuthorizedHeader } from "../src/http/auth.js";
import { testConfig } from "./helpers.js";

describe("MCP auth", () => {
  it("accepts the configured bearer token", () => {
    expect(isAuthorizedHeader("Bearer mcp-token", testConfig)).toBe(true);
  });

  it("rejects missing or wrong bearer tokens", () => {
    expect(isAuthorizedHeader(undefined, testConfig)).toBe(false);
    expect(isAuthorizedHeader("Bearer wrong", testConfig)).toBe(false);
  });

  it("can be explicitly disabled for local development", () => {
    expect(isAuthorizedHeader(undefined, { ...testConfig, allowUnauthenticatedMcp: true })).toBe(true);
  });
});
