import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { createIssue } from "../github/operations.js";
import { createIssueOutputSchema, createIssueSchema } from "../schemas/index.js";
import { logger } from "../helpers/logging.js";
import { withRetry } from "../helpers/retry.js";
import { toolError, toolSuccess } from "../helpers/tool-result.js";

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

    // 3. Handler: lo que se ejecuta cuando el LLM la llama
    async (input) => {
      logger.info("Ejecutando create_issue", { owner: input.owner, repo: input.repo, title: input.title });
      const context = {
        action: "crear el issue",
        resource: `El repositorio "${input.owner}/${input.repo}"`,
      };

      try {
        const issue = await withRetry(() => createIssue(client, input), context);
        return toolSuccess(issue);
      } catch (error) {
        return toolError(error, context);
      }
    },
  );
}