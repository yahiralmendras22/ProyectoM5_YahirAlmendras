import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { createIssue } from "../github/operations.js";
import { createIssueOutputSchema, createIssueSchema } from "../schemas/index.js";
import { logger } from "../helpers/logging.js";

export function registerCreateIssue(server: McpServer, client: GitHubClient): void {
  server.registerTool(
    // 1. Nombre de la tool
    "create_issue",

    // 2. Configuración: lo que ve el LLM
    {
      title: "Crear issue",
      description:
        "Abre un issue nuevo en un repositorio de GitHub, indicando dueño (owner), repositorio (repo), título y descripción opcional. " +
        "Usala cuando el usuario pida reportar un bug, registrar una tarea, proponer una mejora o abrir un issue. " +
        "Si no conocés el nombre exacto del repositorio, usá primero list_repositories. " +
        "Devuelve el número, el título, el estado y la URL del issue creado. " +
        "No sirve para comentar, cerrar ni editar issues existentes.",
      inputSchema: createIssueSchema.shape,
      outputSchema: createIssueOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },

    // 3. Handler: lo que se ejecuta cuando el LLM lo llama
    async (input) => {
      logger.info("Ejecutando create_issue", { owner: input.owner, repo: input.repo, title: input.title });

      try {
        const issue = await createIssue(client, input);
        const result = { ok: true as const, data: issue };

        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error("create_issue falló", { error });
        return {
          isError: true,
          content: [
            { type: "text", text: `No se pudo crear el issue en el repositorio "${input.owner}/${input.repo}".` },
          ],
        };
      }
    },
  );
}