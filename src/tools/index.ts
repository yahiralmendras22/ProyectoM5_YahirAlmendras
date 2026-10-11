import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { GitHubClient } from "../github/client.js";
import { registerCreateCommit } from "./create-commit.js";
import { registerCreateIssue } from "./create-issue.js";
import { registerCreateRepository } from "./create-repository.js";
import { registerListIssues } from "./list-issues.js";
import { registerListRepositories } from "./list-repositories.js";

export function registerTools(server: McpServer, client: GitHubClient): void {
  // Repositorios
  registerListRepositories(server, client);
  registerCreateRepository(server, client);

  // Issues
  registerCreateIssue(server, client);
  registerListIssues(server, client);

  // Commits
  registerCreateCommit(server, client);
}