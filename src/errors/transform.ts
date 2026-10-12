import {
  AppError,
  AuthenticationError,
  GitHubAPIError,
  NetworkError,
  UnexpectedError,
  ValidationError,
} from "./app-errors.js";
import {
  getGitHubValidationDetail,
  getRetryAfterSeconds,
  isHttpError,
  isRateLimitError,
} from "./http.js";

function formatWait(seconds: number): string {
  if (seconds < 60) return `${seconds} segundos`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} minuto${minutes === 1 ? "" : "s"}`;
}

export interface ErrorContext {
  /** Qué se estaba intentando hacer, ej: "crear el issue" */
  action: string;
  /** Sobre qué recurso, ej: 'El repositorio "yahir/mi-repo"' */
  resource?: string;
}

export function toAppError(error: unknown, context: ErrorContext): AppError {
  if (error instanceof AppError) return error;

  if (!isHttpError(error)) {
    return new UnexpectedError(
      `No se pudo ${context.action} por un error inesperado. Intentá de nuevo en unos segundos.`,
      { cause: error },
    );
  }

  const { status } = error;

  // Octokit usa status 500 SIN respuesta cuando la petición ni siquiera llegó a GitHub
  if (status === 500 && error.response === undefined) {
    return new NetworkError(
      `No se pudo conectar con GitHub para ${context.action}. Revisá tu conexión a internet e intentá de nuevo.`,
      { cause: error },
    );
  }

  if (isRateLimitError(error)) {
    const waitSeconds = getRetryAfterSeconds(error);
    const wait = waitSeconds !== undefined ? formatWait(waitSeconds) : "unos minutos";
    return new GitHubAPIError(
      `GitHub limitó temporalmente las peticiones (rate limit). Esperá ${wait} e intentá de nuevo.`,
      status,
      { cause: error, isRateLimit: true, retryAfterSeconds: waitSeconds },
    );
  }

  switch (status) {
    case 401:
      return new AuthenticationError(
        "El token de GitHub es inválido o expiró. Generá uno nuevo y actualizá GITHUB_TOKEN en el archivo .env.",
        { cause: error },
      );
    case 403:
      return new AuthenticationError(
        `El token no tiene permisos para ${context.action}. Verificá que tenga los scopes repo, user y admin:org.`,
        { cause: error },
      );
    case 404:
      return new GitHubAPIError(
        `${context.resource ?? "El recurso"} no fue encontrado. Verificá el nombre e intentá de nuevo.`,
        status,
        { cause: error },
      );
    case 409:
      return new GitHubAPIError(
        `No se pudo ${context.action} por un conflicto en GitHub (por ejemplo, el repositorio está vacío o el archivo cambió mientras tanto). Intentá de nuevo.`,
        status,
        { cause: error },
      );
    case 422: {
      const detail = getGitHubValidationDetail(error);
      if (/already exists/i.test(detail)) {
        return new ValidationError(
          `No se pudo ${context.action}: ya existe uno con ese nombre. Elegí otro nombre.`,
          { cause: error },
        );
      }
      return new ValidationError(
        `GitHub rechazó los datos al ${context.action}.${detail ? ` Detalle: ${detail}` : ""}`,
        { cause: error },
      );
    }
    default:
      if (status >= 500) {
        return new GitHubAPIError(
          `GitHub tiene un problema temporal (error ${status}). Intentá de nuevo en unos minutos.`,
          status,
          { cause: error },
        );
      }
      return new GitHubAPIError(
        `GitHub respondió con un error inesperado (${status}) al ${context.action}.`,
        status,
        { cause: error },
      );
  }
}