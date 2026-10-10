import * as z from "zod";
import { ownerSchema, repoNameSchema } from "./common.js";

// ---------- Issue (forma que devolvemos al LLM) ----------

export const IssueSchema = z.object({
  number: z.number().int(),
  title: z.string(),
  state: z.string(),
  url: z.url(),
  author: z.string().nullable(),
  labels: z.array(z.string()),
  created_at: z.string(),
});

export type Issue = z.infer<typeof IssueSchema>;

// ---------- create_issue ----------

export const createIssueSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema.describe("Nombre del repositorio donde se va a crear el issue"),
  title: z
    .string()
    .trim()
    .min(1, "El título del issue no puede estar vacío.")
    .max(256, "El título del issue puede tener como máximo 256 caracteres.")
    .describe("Título breve y descriptivo del issue"),
  body: z
    .string()
    .max(65536, "El cuerpo del issue puede tener como máximo 65536 caracteres.")
    .optional()
    .describe("Descripción detallada del issue. Acepta Markdown (opcional)"),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>;

export const createIssueOutputSchema = z.object({
  ok: z.literal(true),
  data: IssueSchema,
});

// ---------- list_issues ----------

export const listIssuesSchema = z.object({
  owner: ownerSchema,
  repo: repoNameSchema.describe("Nombre del repositorio del que se van a listar los issues"),
  state: z
    .enum(["open", "closed", "all"])
    .default("open")
    .describe("Estado de los issues: 'open' (abiertos), 'closed' (cerrados) o 'all' (default: open)"),
  per_page: z
    .number()
    .int("La cantidad debe ser un número entero.")
    .min(1, "La cantidad mínima es 1 issue.")
    .max(100, "GitHub devuelve como máximo 100 issues por pedido.")
    .default(30)
    .describe("Cantidad de issues a devolver, máximo 100 (default: 30)"),
});

export type ListIssuesInput = z.infer<typeof listIssuesSchema>;

export const listIssuesOutputSchema = z.object({
  ok: z.literal(true),
  data: z.array(IssueSchema),
});