import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { toAppError, type ErrorContext } from "../errors/index.js";
import { logger } from "./logging.js";

/** Respuesta exitosa con el formato { ok: true, data } */
export function toolSuccess<T>(data: T) {
  const result = { ok: true as const, data };
  return {
    structuredContent: result,
    content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
  };
}

/** Respuesta de error: mensaje claro para el LLM, detalle técnico solo en los logs */
export function toolError(error: unknown, context: ErrorContext): CallToolResult {
  const appError = toAppError(error, context);
  logger.error(`Falló: ${context.action}`, { type: appError.name, error: appError.cause ?? appError });
  return {
    isError: true,
    content: [{ type: "text", text: appError.userMessage }],
  };
}