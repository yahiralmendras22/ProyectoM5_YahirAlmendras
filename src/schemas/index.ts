import * as z from "zod";

// ---------- Campos reutilizables ----------

export const ownerSchema = z
  .string()
  .trim()
  .min(1, "El dueño del repositorio no puede estar vacío.")
  .max(39, "Un usuario u organización de GitHub tiene como máximo 39 caracteres.")
  .regex(/^[a-zA-Z0-9-]+$/, {
    message: "El dueño solo puede contener letras, números y guiones medios.",
  })
  .describe("Usuario u organización dueña del repositorio (ej: 'yahiralmendras22')");

export const repoNameSchema = z
  .string()
  .trim()
  .min(3, "El nombre del repositorio debe tener al menos 3 caracteres.")
  .max(100, "El nombre del repositorio puede tener como máximo 100 caracteres.")
  .regex(/^[a-zA-Z0-9_.-]+$/, {
    message:
      "El nombre solo puede contener letras, números, guiones bajos, puntos y guiones medios. Sin espacios.",
  });

// ---------- Repositorio (forma que devolvemos al LLM) ----------

export const RepositorySchema = z.object({
  full_name: z.string(),
  url: z.url(),
  private: z.boolean(),
  description: z.string().nullable(),
  owner: z.string(),
});

export type Repository = z.infer<typeof RepositorySchema>;

// ---------- create_repository ----------

export const createRepositorySchema = z.object({
  name: repoNameSchema.describe(
    "Nombre del repositorio nuevo (sin espacios, solo letras, números, '_', '.' y '-'; mínimo 3 y máximo 100 caracteres)",
  ),
  description: z
    .string()
    .max(350, "La descripción puede tener como máximo 350 caracteres.")
    .optional()
    .describe("Descripción opcional del repositorio"),
  private: z
    .boolean()
    .default(false)
    .describe("Si el repositorio es privado (default: false)"),
});

export type CreateRepositoryInput = z.infer<typeof createRepositorySchema>;

export const createRepositoryOutputSchema = z.object({
  ok: z.literal(true),
  data: RepositorySchema,
});

// ---------- list_repositories ----------

export const listRepositoriesSchema = z.object({
  type: z
    .enum(["all", "public", "private"])
    .default("all")
    .describe("Tipo de repositorios a listar: 'all', 'public' o 'private' (default: all)"),
  sort: z
    .enum(["created", "updated", "pushed", "full_name"])
    .default("updated")
    .describe("Criterio de ordenamiento: 'updated', 'created', 'pushed' o 'full_name' (default: updated)"),
  per_page: z
    .number()
    .int("La cantidad debe ser un número entero.")
    .min(1, "La cantidad mínima es 1 repositorio.")
    .max(100, "GitHub devuelve como máximo 100 repositorios por pedido.")
    .default(30)
    .describe("Cantidad de repositorios a devolver, máximo 100 (default: 30)"),
});

export type ListRepositoriesInput = z.infer<typeof listRepositoriesSchema>;

export const listRepositoriesOutputSchema = z.object({
  ok: z.literal(true),
  data: z.array(RepositorySchema),
});