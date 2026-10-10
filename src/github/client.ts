import { Octokit } from "@octokit/rest";

export function createGitHubClient(token: string): Octokit {
  return new Octokit({
    auth: token,
    userAgent: "github-ai-agent-mcp/1.0.0",
    log: {
      debug: () => {},
      info: () => {},
      warn: (message: string) => process.stderr.write(`[octokit] ${message}\n`),
      error: (message: string) => process.stderr.write(`[octokit] ${message}\n`),
    },
  });
}

export type GitHubClient = Octokit;