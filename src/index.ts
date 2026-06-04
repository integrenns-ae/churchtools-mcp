import { loadLocalEnvFile } from "./env.js";
import { createApp } from "./app.js";

async function main(): Promise<void> {
  loadLocalEnvFile();
  const { app, config, catalog } = await createApp();

  app.listen(config.port, config.host, () => {
    console.log(
      `ChurchTools MCP server listening on http://${config.host}:${config.port}/mcp with ${catalog.operations.length} OpenAPI operations.`
    );
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
