import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { listRepositories } from "../github/operations.js";
import { listRepositoriesOutputSchema, listRepositoriesSchema } from "../schemas/index.js";
import { logger } from "../helpers/logging.js";
import { withRetry } from "../helpers/retry.js";
import { toolError, toolSuccess } from "../helpers/tool-result.js";

export function registerListRepositories(server: McpServer, client: GitHubClient): void {
  server.registerTool(
    // 1. Nombre de la tool
    "list_repositories",

    // 2. Configuración: lo que ve el LLM
    {
      title: "Listar repositorios",
      description:
        "Lista los repositorios del usuario de GitHub autenticado (el dueño del token). " +
        "Usala cuando el usuario pida ver, buscar o contar SUS repositorios, o cuando necesites " +
        "el nombre exacto de un repositorio antes de crear issues o commits. " +
        "Devuelve nombre completo, URL, visibilidad, descripción y dueño de cada repositorio. " +
        "No sirve para listar repositorios de otros usuarios ni para listar issues.",
      inputSchema: listRepositoriesSchema.shape,
      outputSchema: listRepositoriesOutputSchema.shape,
      annotations: { readOnlyHint: true },
    },

    // 3. Handler: lo que se ejecuta cuando el LLM la llama
    async (input) => {
      logger.info("Ejecutando list_repositories", { input });
      const context = { action: "listar tus repositorios" };

      try {
        const repositories = await withRetry(() => listRepositories(client, input), context);
        return toolSuccess(repositories);
      } catch (error) {
        return toolError(error, context);
      }
    },
  );
}