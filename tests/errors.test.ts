import { describe, expect, it, vi } from "vitest";
import {
  AuthenticationError,
  GitHubAPIError,
  NetworkError,
  toAppError,
  ValidationError,
} from "../src/errors/index.js";
import { withRetry } from "../src/helpers/retry.js";
import { redact } from "../src/helpers/logging.js";

const context = { action: "crear el issue", resource: 'El repositorio "yahir/mi-repo"' };

/** Crea un error con la misma forma que los que tira Octokit cuando GitHub responde */
function httpError(status: number, response: object = { headers: {}, data: {} }) {
  return Object.assign(new Error(`HTTP ${status}`), { status, response });
}

/** Así tira Octokit una falla de red: status 500 pero SIN respuesta de GitHub */
function networkFailure() {
  return Object.assign(new Error("fetch failed"), { status: 500 });
}

describe("toAppError: transformación a lenguaje natural", () => {
  it("convierte un 404 en el mensaje de recurso no encontrado", () => {
    const error = toAppError(httpError(404), context);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(error.userMessage).toBe(
      'El repositorio "yahir/mi-repo" no fue encontrado. Verificá el nombre e intentá de nuevo.',
    );
  });

  it("convierte un 401 en AuthenticationError indicando revisar el token", () => {
    const error = toAppError(httpError(401), context);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.userMessage).toContain("GITHUB_TOKEN");
  });

  it("convierte un 403 sin rate limit en un error de permisos", () => {
    const error = toAppError(httpError(403), context);

    expect(error).toBeInstanceOf(AuthenticationError);
    expect(error.userMessage).toContain("scopes repo, user y admin:org");
  });

  it("detecta el rate limit por los headers de GitHub", () => {
    const resetIn120s = String(Math.floor(Date.now() / 1000) + 120);
    const error = toAppError(
      httpError(403, { headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": resetIn120s }, data: {} }),
      context,
    );

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).isRateLimit).toBe(true);
    expect(error.userMessage).toContain("rate limit");
  });

  it("convierte un 422 de nombre repetido en ValidationError", () => {
    const error = toAppError(
      httpError(422, { headers: {}, data: { errors: [{ message: "name already exists on this account" }] } }),
      context,
    );

    expect(error).toBeInstanceOf(ValidationError);
    expect(error.userMessage).toContain("ya existe uno con ese nombre");
  });

  it("distingue una falla de red (500 sin respuesta) de un error de GitHub", () => {
    const error = toAppError(networkFailure(), context);

    expect(error).toBeInstanceOf(NetworkError);
    expect(error.userMessage).toContain("conexión a internet");
  });
});

describe("withRetry: exponential backoff", () => {
  it("reintenta el rate limit esperando 1s y luego 2s", async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const operation = vi
      .fn()
      .mockRejectedValueOnce(httpError(429))
      .mockRejectedValueOnce(httpError(429))
      .mockResolvedValue("ok");

    const result = await withRetry(operation, context, { sleep });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(3);
    expect(sleep.mock.calls).toEqual([[1000], [2000]]);
  });

  it("no reintenta errores que no son rate limit (404)", async () => {
    const sleep = vi.fn();
    const operation = vi.fn().mockRejectedValue(httpError(404));

    await expect(withRetry(operation, context, { sleep })).rejects.toBeInstanceOf(GitHubAPIError);
    expect(operation).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled();
  });

  it("se rinde después del máximo de reintentos", async () => {
    const operation = vi.fn().mockRejectedValue(httpError(429));

    await expect(withRetry(operation, context, { retries: 2, sleep: async () => {} })).rejects.toMatchObject({
      isRateLimit: true,
    });
    expect(operation).toHaveBeenCalledTimes(3);
  });
});

describe("redact: logs sin información sensible", () => {
  it("oculta tokens de GitHub y campos sensibles", () => {
    const result = redact({
      authorization: "token abc",
      detalle: "falló con ghp_abcdefghijklmnopqrstuvwxyz123456",
    });

    expect(result).toEqual({ authorization: "[REDACTED]", detalle: "falló con [REDACTED]" });
  });
});