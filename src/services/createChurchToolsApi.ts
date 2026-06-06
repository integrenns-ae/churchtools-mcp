import type { AppConfig } from "../config.js";
import { ChurchToolsApi } from "./churchtoolsApi.js";
import {
  ForwardedPatChurchToolsCredentialsProvider,
  StaticChurchToolsCredentialsProvider
} from "./credentials.js";

/**
 * Builds a ChurchTools API client with the credentials provider that matches the
 * configured auth mode. Shared by the HTTP entrypoint (app.ts) and the stdio
 * entrypoint (stdio.ts).
 */
export function createChurchToolsApi(config: AppConfig): ChurchToolsApi {
  if (config.churchToolsAuthMode === "pat-forwarding") {
    return new ChurchToolsApi(config, new ForwardedPatChurchToolsCredentialsProvider());
  }

  if (!config.churchToolsPat) {
    throw new Error("PAT mode requires CHURCHTOOLS_PAT.");
  }

  return new ChurchToolsApi(config, new StaticChurchToolsCredentialsProvider(config.churchToolsPat));
}
