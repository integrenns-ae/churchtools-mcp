#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadLocalEnvFile } from "./env.js";
import { parseConfig } from "./config.js";
import { createChurchToolsMcpServer } from "./mcp/server.js";
import { createChurchToolsApi } from "./services/createChurchToolsApi.js";
import { OpenApiCatalog } from "./services/openApiCatalog.js";

/**
 * stdio entrypoint for local use (Claude Desktop / `npx`).
 *
 * Unlike the HTTP entrypoint, stdio is single-user: the ChurchTools login token
 * comes from CHURCHTOOLS_PAT and there is no HTTP layer in front of the server,
 * so the per-request bearer token (MCP_SERVER_TOKEN) and pat-forwarding mode do
 * not apply. We force pat mode and disable the MCP auth requirement before
 * parsing, while still requiring CHURCHTOOLS_BASE_URL and CHURCHTOOLS_PAT.
 *
 * IMPORTANT: stdout is the JSON-RPC channel for stdio transport. Never write to
 * stdout here — all logging must go to stderr (console.error).
 */
async function main(): Promise<void> {
  loadLocalEnvFile();

  const config = parseConfig({
    ...process.env,
    CHURCHTOOLS_AUTH_MODE: "pat",
    ALLOW_UNAUTHENTICATED_MCP: "true"
  });

  const catalog = await OpenApiCatalog.load(config.churchToolsOpenApiUrl);
  const api = createChurchToolsApi(config);
  const server = createChurchToolsMcpServer({ config, api, catalog });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error(
    `ChurchTools MCP server (stdio) ready for ${config.churchToolsBaseUrl} with ${catalog.operations.length} OpenAPI operations.`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
