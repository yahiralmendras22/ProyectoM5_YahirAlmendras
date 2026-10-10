import { LOG_LEVELS, type LogLevel } from "../types.js";

// ---------- 1. Ocultar datos sensibles ----------

const TOKEN_PATTERN = /\b(gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g;
const SENSITIVE_KEYS = /token|authorization|password|secret/i;
const REDACTED = "[REDACTED]";

export function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value.replace(TOKEN_PATTERN, REDACTED);
  }
  if (Array.isArray(value)) {
    return value.map(redact);
  }
  if (value instanceof Error) {
    return { name: value.name, message: redact(value.message) };
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        SENSITIVE_KEYS.test(key) ? REDACTED : redact(val),
      ]),
    );
  }
  return value;
}

// ---------- 2. Niveles de log ----------

let currentLevel: LogLevel = "info";

export function setLogLevel(level: LogLevel): void {
  currentLevel = level;
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(currentLevel);
}

// ---------- 3. Escribir el log en stderr ----------

function write(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry = {
    time: new Date().toISOString(),
    level,
    message: redact(message),
    ...(context ? { context: redact(context) } : {}),
  };
  process.stderr.write(`${JSON.stringify(entry)}\n`);
}

// ---------- 4. Lo que usa el resto del proyecto ----------

export const logger = {
  debug: (message: string, context?: Record<string, unknown>) => write("debug", message, context),
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};