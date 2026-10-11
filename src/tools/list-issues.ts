import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { listIssues } from "../github/operations.js";
import { listIssuesOutputSchema, listIssuesSchema } from "../schemas/index.js";
import { logger } from "../helpers/logging.js";

export function registerListIssues(server: McpServer, client: GitHubClient): void {
  server.registerTool(
    // 1. Nombre de la tool
    "list_issues",

    // 2. Configuración: lo que ve el LLM
    {
      title: "Listar issues",
      description:
        "Lista los issues de un repositorio de GitHub específico, indicando dueño (owner) y repositorio (repo). " +
        "Por defecto devuelve solo los issues ABIERTOS; usá state 'closed' o 'all' si el usuario pide los cerrados o todos. " +
        "Usala cuando el usuario quiera ver, revisar o contar los issues, bugs o tareas pendientes de un repositorio. " +
        "Devuelve número, título, estado, autor, etiquetas, fecha y URL de cada issue. No incluye pull requests.",
      inputSchema: listIssuesSchema.shape,
      outputSchema: listIssuesOutputSchema.shape,
      annotations: { readOnlyHint: true },
    },

    // 3. Handler: lo que se ejecuta cuando el LLM lo llama
    async (input) => {
      logger.info("Ejecutando list_issues", { input });

      try {
        const issues = await listIssues(client, input);
        const result = { ok: true as const, data: issues };

        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error("list_issues falló", { error });
        return {
          isError: true,
          content: [
            { type: "text", text: `No se pudieron obtener los issues del repositorio "${input.owner}/${input.repo}".` },
          ],
        };
      }
    },
  );
}