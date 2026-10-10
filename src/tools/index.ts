import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { registerListRepositories } from "./list-repositories.js";

export function registerTools(server: McpServer, client: GitHubClient): void {
  registerListRepositories(server, client);
}