#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/env.js";
import { createGitHubClient } from "./github/client.js";
import { logger, setLogLevel } from "./helpers/logging.js";
import { registerTools } from "./tools/index.js";

async function main(): Promise<void> {
  // 1. Lee y valida el .env
  const config = loadConfig();
  setLogLevel(config.logLevel);

  // 2. Crea el cliente de GitHub con el token
  const client = createGitHubClient(config.githubToken);

  // 3. Crea el MCP server
  const server = new McpServer({
    name: "github-ai-agent",
    version: "1.0.0",
  });

  // 4. Registra las tools
  registerTools(server, client);

  // 5. Conectado por stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server iniciado y escuchando por stdio");
}

main().catch((error: unknown) => {
  logger.error("No se pudo iniciar el MCP server", { error });
  process.exit(1);
});