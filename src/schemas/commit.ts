import * as z from "zod";
import { ownerSchema, repoNameSchema } from "./common.js";

// ---------- Commit (forma que devolvemos al LLM) ----------

export const CommitSchema = z.object({
  sha: z.string(),
  message: z.string(),
  url: z.url(),
  path: z.string(),
  created: z.boolean(),
});

export type Commit = z.infer<typeof CommitSchema>;

// ---------- create_commit ----------

export const createCommitSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema.describe("Nombre del repositorio donde se va a hacer el commit"),
  path: z
    .string()
    .trim()
    .min(1, "La ruta del archivo no puede estar vacía.")
    .max(255, "La ruta del archivo puede tener como máximo 255 caracteres.")
    .refine((path) => !path.startsWith("/"), {
      message: "La ruta debe ser relativa a la raíz del repositorio (sin '/' al inicio). Ej: 'docs/notas.md'.",
    })
    .refine((path) => !path.split("/").includes(".."), {
      message: "La ruta no puede contener '..'.",
    })
    .describe(
      "Ruta del archivo dentro del repositorio, relativa a la raíz (ej: 'README.md' o 'src/index.ts'). Si el archivo existe se modifica; si no, se crea",
    ),
  content: z
    .string()
    .max(1_000_000, "El contenido del archivo puede tener como máximo 1.000.000 de caracteres.")
    .describe("Contenido COMPLETO que va a tener el archivo después del commit (reemplaza todo el contenido anterior)"),
  message: z
    .string()
    .trim()
    .min(1, "El mensaje del commit no puede estar vacío.")
    .describe("Mensaje del commit, breve y en imperativo (ej: 'Agregar sección de instalación al README')"),
  branch: z
    .string()
    .trim()
    .min(1, "El nombre de la rama no puede estar vacío.")
    .regex(/^[a-zA-Z0-9._/-]+$/, {
      message: "El nombre de la rama solo puede contener letras, números, '.', '_', '/' y '-'.",
    })
    .optional()
    .describe("Rama donde hacer el commit (opcional; si no se indica, se usa la rama por defecto del repositorio)"),
});

export type CreateCommitInput = z.infer<typeof createCommitSchema>;

export const createCommitOutputSchema = z.object({
  ok: z.literal(true),
  data: CommitSchema,
});