import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { createRepository } from "../github/operations.js";
import {
  createRepositoryOutputSchema,
  createRepositorySchema,
} from "../schemas/index.js";
import { logger } from "../helpers/logging.js";
import { withRetry } from "../helpers/retry.js";
import { toolError, toolSuccess } from "../helpers/tool-result.js";

export function registerCreateRepository(server: McpServer, client: GitHubClient): void {
  server.registerTool(
    // 1. Nombre de la tool
    "create_repository",

    // 2. Configuración: lo que ve el LLM
    {
      title: "Crear repositorio",
      description:
        "Crea un repositorio NUEVO en la cuenta del usuario de GitHub autenticado (el dueño del token). " +
        "Usala cuando el usuario pida crear, iniciar o armar un repositorio o proyecto nuevo en GitHub. " +
        "Por defecto el repositorio es público; solo hacelo privado si el usuario lo pide. " +
        "Devuelve el nombre completo, la URL y la visibilidad del repositorio creado. " +
        "No crea repositorios en organizaciones ni modifica repositorios existentes.",
      inputSchema: createRepositorySchema.shape,
      outputSchema: createRepositoryOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
    },

    // 3. Handler: lo que se ejecuta cuando el LLM la llama
    async (input) => {
      logger.info("Ejecutando create_repository", { name: input.name, private: input.private });
      const context = { action: `crear el repositorio "${input.name}"` };

      try {
        const repository = await withRetry(() => createRepository(client, input), context);
        return toolSuccess(repository);
      } catch (error) {
        return toolError(error, context);
      }
    },
  );
}