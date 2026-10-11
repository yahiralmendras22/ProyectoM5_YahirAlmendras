import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { createCommit } from "../github/operations.js";
import { createCommitOutputSchema, createCommitSchema } from "../schemas/index.js";
import { logger } from "../helpers/logging.js";

export function registerCreateCommit(server: McpServer, client: GitHubClient): void {
  server.registerTool(
    // 1. Nombre de la tool
    "create_commit",

    // 2. Configuración: lo que ve el LLM
    {
      title: "Crear commit",
      description:
        "Hace un commit en un repositorio de GitHub creando un archivo nuevo o modificando uno existente. " +
        "Usala cuando el usuario pida agregar, crear, actualizar o editar un archivo en un repositorio (por ejemplo, un README). " +
        "IMPORTANTE: el parámetro content reemplaza TODO el contenido del archivo. Para modificar un archivo existente, " +
        "mandá el contenido completo final, no solo la parte nueva. " +
        "Si no conocés el nombre exacto del repositorio, usá primero list_repositories. " +
        "Devuelve el SHA, el mensaje, la URL del commit y si el archivo fue creado o modificado. " +
        "Trabaja con un solo archivo por commit y no puede borrar archivos.",
      inputSchema: createCommitSchema.shape,
      outputSchema: createCommitOutputSchema.shape,
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false },
    },

    // 3. Handler: lo que se ejecuta cuando el LLM lo llama
    async (input) => {
      logger.info("Ejecutando create_commit", {
        owner: input.owner,
        repo: input.repo,
        path: input.path,
        branch: input.branch ?? "(rama por defecto)",
        contentLength: input.content.length,
      });

      try {
        const commit = await createCommit(client, input);
        const result = { ok: true as const, data: commit };

        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error("create_commit falló", { error });
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `No se pudo hacer el commit del archivo "${input.path}" en "${input.owner}/${input.repo}".`,
            },
          ],
        };
      }
    },
  );
}