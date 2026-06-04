import type { Request, RequestHandler } from "express";
import type { AppConfig } from "../config.js";

export function isAuthorizedHeader(authorizationHeader: string | undefined, config: AppConfig): boolean {
  if (config.allowUnauthenticatedMcp) {
    return true;
  }

  if (!config.mcpServerToken) {
    return false;
  }

  return authorizationHeader === `Bearer ${config.mcpServerToken}`;
}

export function isAuthorizedRequest(req: Request, config: AppConfig): boolean {
  return isAuthorizedHeader(req.header("authorization"), config);
}

export function requireMcpAuth(config: AppConfig): RequestHandler {
  return (req, res, next) => {
    if (isAuthorizedRequest(req, config)) {
      next();
      return;
    }

    res.status(401).json({
      error: "unauthorized",
      message: "Missing or invalid MCP bearer token."
    });
  };
}
