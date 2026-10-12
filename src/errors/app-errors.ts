/**
 * Errores del dominio.
 *
 * Cada clase representa una CATEGORÍA de error y trae un mensaje en lenguaje
 * natural (userMessage) que el LLM puede transmitir directamente al usuario.
 */

export abstract class AppError extends Error {
  /** Mensaje claro para el usuario final (lo recibe el LLM) */
  readonly userMessage: string;

  constructor(userMessage: string, options?: { cause?: unknown }) {
    super(userMessage, options);
    this.name = new.target.name;
    this.userMessage = userMessage;
  }
}

/** Los datos enviados no son válidos (rechazados por nosotros o por GitHub) */
export class ValidationError extends AppError {}

/** El token es inválido, expiró o no tiene permisos suficientes */
export class AuthenticationError extends AppError {}

/** No se pudo conectar con GitHub (sin internet, DNS, timeout) */
export class NetworkError extends AppError {}

/** Error que no encaja en ninguna categoría (por ejemplo, un bug nuestro) */
export class UnexpectedError extends AppError {}

/** GitHub respondió con un error (404, 409, 5xx, rate limit...) */
export class GitHubAPIError extends AppError {
  readonly status: number;
  /** true si GitHub rechazó la petición por exceso de pedidos */
  readonly isRateLimit: boolean;
  /** Segundos que GitHub pidió esperar (si lo informó) */
  readonly retryAfterSeconds: number | undefined;

  constructor(
    userMessage: string,
    status: number,
    options?: { cause?: unknown; isRateLimit?: boolean; retryAfterSeconds?: number },
  ) {
    super(userMessage, options);
    this.status = status;
    this.isRateLimit = options?.isRateLimit ?? false;
    this.retryAfterSeconds = options?.retryAfterSeconds;
  }
}