import type { ToolResult } from "../utils/format.js";
import { formatMessageResult } from "../utils/format.js";

export interface ConfirmationHost {
  getClientCapabilities?: () => { elicitation?: unknown } | undefined;
  elicitInput?: (request: {
    mode: "form";
    message: string;
    requestedSchema: {
      type: "object";
      properties: Record<string, unknown>;
      required: string[];
    };
  }) => Promise<{ action: "accept" | "decline" | "cancel"; content?: Record<string, unknown> }>;
}

export interface ConfirmationOptions {
  confirm?: boolean;
  operation: string;
  target: string;
  preview: unknown;
}

export type ConfirmationDecision = { confirmed: true } | { confirmed: false; result: ToolResult };

export async function requireWriteConfirmation(
  host: ConfirmationHost | undefined,
  options: ConfirmationOptions
): Promise<ConfirmationDecision> {
  if (options.confirm === true) {
    return { confirmed: true };
  }

  const message = confirmationMessage(options);

  if (host?.getClientCapabilities?.()?.elicitation && host.elicitInput) {
    try {
      const result = await host.elicitInput({
        mode: "form",
        message,
        requestedSchema: {
          type: "object",
          properties: {
            confirm: {
              type: "boolean",
              title: "Confirm write",
              description: "Set to true to execute this ChurchTools write operation."
            }
          },
          required: ["confirm"]
        }
      });

      if (result.action === "accept" && result.content?.confirm === true) {
        return { confirmed: true };
      }

      return {
        confirmed: false,
        result: formatMessageResult("ChurchTools write cancelled.", {
          status: result.action === "decline" ? "declined" : "cancelled",
          operation: options.operation,
          target: options.target
        })
      };
    } catch {
      return fallbackConfirmationRequired(options, message);
    }
  }

  return fallbackConfirmationRequired(options, message);
}

function fallbackConfirmationRequired(options: ConfirmationOptions, message: string): ConfirmationDecision {
  return {
    confirmed: false,
    result: formatMessageResult(`${message}\n\nRetry this tool with confirm=true to execute it.`, {
      status: "confirmation_required",
      operation: options.operation,
      target: options.target,
      preview: options.preview
    })
  };
}

function confirmationMessage(options: ConfirmationOptions): string {
  return [
    `Confirm ChurchTools write operation: ${options.operation}`,
    `Target: ${options.target}`,
    "Preview:",
    JSON.stringify(options.preview, null, 2)
  ].join("\n");
}
