import { GitHubAPIError, toAppError, type ErrorContext } from "../errors/index.js";
import { logger } from "./logging.js";

export interface RetryOptions {
  /** Cantidad máxima de reintentos (sin contar el primer intento) */
  retries?: number;
  /** Espera base en milisegundos; se duplica en cada intento */
  baseDelayMs?: number;
  /** Espera máxima: si GitHub pide esperar más, no se reintenta */
  maxDelayMs?: number;
  /** Función para esperar (inyectable para los tests) */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Ejecuta `operation` y, si GitHub responde con rate limit, reintenta con
 * exponential backoff: 1s, 2s, 4s... (o lo que pida GitHub, si es más).
 *
 * Solo reintenta rate limits: reintentar un 404 o un 401 no cambia el
 * resultado, y reintentar una creación ante un error de red podría
 * duplicar el repositorio o el issue.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options: RetryOptions = {},
): Promise<T> {
  const { retries = 3, baseDelayMs = 1000, maxDelayMs = 10_000, sleep = defaultSleep } = options;

  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (rawError) {
      const error = toAppError(rawError, context);

      const canRetry = error instanceof GitHubAPIError && error.isRateLimit && attempt < retries;
      if (!canRetry) throw error;

      const backoffMs = baseDelayMs * 2 ** attempt;
      const requestedMs = (error.retryAfterSeconds ?? 0) * 1000;
      const delayMs = Math.max(backoffMs, requestedMs);

      // Si GitHub pide esperar demasiado, no tiene sentido bloquear al agente
      if (delayMs > maxDelayMs) throw error;

      logger.warn("Rate limit de GitHub, reintentando", { attempt: attempt + 1, delayMs });
      await sleep(delayMs);
    }
  }
}