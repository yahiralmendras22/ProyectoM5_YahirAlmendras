/**
 * Lectura segura de los errores que tira Octokit.
 * Ninguna función asume la forma del error: primero la verifica.
 */

export interface HttpErrorLike {
  status: number;
  message: string;
  response?: {
    headers?: Record<string, string | number | undefined>;
    data?: unknown;
  };
}

export function isHttpError(error: unknown): error is HttpErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  );
}

/** Devuelve el status HTTP de un error de Octokit, o undefined si no tiene */
export function getHttpStatus(error: unknown): number | undefined {
  return isHttpError(error) ? error.status : undefined;
}

/** Detecta si GitHub rechazó la petición por rate limit */
export function isRateLimitError(error: HttpErrorLike): boolean {
  if (error.status !== 403 && error.status !== 429) return false;
  const headers = error.response?.headers ?? {};
  return (
    error.status === 429 ||
    String(headers["x-ratelimit-remaining"]) === "0" ||
    headers["retry-after"] !== undefined ||
    /rate limit/i.test(error.message)
  );
}

/** Cuántos segundos pide esperar GitHub según sus headers (undefined si no lo dice) */
export function getRetryAfterSeconds(error: HttpErrorLike): number | undefined {
  const headers = error.response?.headers ?? {};

  const retryAfter = Number(headers["retry-after"]);
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter;

  const resetEpoch = Number(headers["x-ratelimit-reset"]);
  if (String(headers["x-ratelimit-remaining"]) === "0" && Number.isFinite(resetEpoch)) {
    return Math.max(1, Math.ceil(resetEpoch - Date.now() / 1000));
  }

  return undefined;
}

/** Extrae los mensajes de validación que GitHub manda en un 422 */
export function getGitHubValidationDetail(error: HttpErrorLike): string {
  const data = error.response?.data;
  if (typeof data !== "object" || data === null || !("errors" in data) || !Array.isArray(data.errors)) {
    return "";
  }
  return data.errors
    .map((item: unknown) =>
      typeof item === "object" && item !== null && "message" in item ? String(item.message) : "",
    )
    .filter((message: string) => message !== "")
    .join(" ");
}