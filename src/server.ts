#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { loadConfig } from "./config/env.js";
import { logger, setLogLevel } from "./helpers/logging.js";

async function main(): Promise<void> {
  // 1. Leer y validar el .env
  const config = loadConfig();
  setLogLevel(config.logLevel);

  // 2. Crear el MCP server
  const server = new McpServer({
    name: "github-ai-agent",
    version: "1.0.0",
  });

  // 3. Conectarlo por stdio
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logger.info("MCP server iniciado y escuchando por stdio");
}

main().catch((error: unknown) => {
  logger.error("No se pudo iniciar el MCP server", { error });
  process.exit(1);
});