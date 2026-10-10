import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { z } from "zod";
import { LOG_LEVELS, type AppConfig } from "../types.js";

// ---------- 1. Dónde está el .env ----------

const ENV_PATH = resolve(dirname(fileURLToPath(import.meta.url)), "../../.env");

// ---------- 2. Reglas que deben cumplir las variables ----------

const envSchema = z.object({
  GITHUB_TOKEN: z
    .string({ error: "Falta la variable de entorno GITHUB_TOKEN." })
    .trim()
    .min(1, "GITHUB_TOKEN está vacío. Configurá tu Personal Access Token de GitHub."),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

// ---------- 3. Cargar y validar ----------

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  if (env === process.env) {
    loadDotenv({ path: ENV_PATH, quiet: true });
  }

  const result = envSchema.safeParse(env);
  if (!result.success) {
    const detail = result.error.issues.map((issue) => issue.message).join(" ");
    throw new Error(`Configuración inválida: ${detail}`);
  }

  return {
    githubToken: result.data.GITHUB_TOKEN,
    logLevel: result.data.LOG_LEVEL,
  };
}