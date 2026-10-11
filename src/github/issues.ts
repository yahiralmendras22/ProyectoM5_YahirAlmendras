import type { GitHubClient } from "./client.js";
import type { CreateIssueInput, Issue, ListIssuesInput } from "../schemas/index.js";

interface GitHubIssueResponse {
  number: number;
  title: string;
  state: string;
  html_url: string;
  user: { login: string } | null;
  labels: Array<string | { name?: string | null }>;
  created_at: string;
  pull_request?: unknown;
}

function toIssue(issue: GitHubIssueResponse): Issue {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    author: issue.user?.login ?? null,
    labels: issue.labels
      .map((label) => (typeof label === "string" ? label : label.name ?? ""))
      .filter((name) => name !== ""),
    created_at: issue.created_at,
  };
}

export async function createIssue(client: GitHubClient, input: CreateIssueInput): Promise<Issue> {
  const { data } = await client.rest.issues.create({
    owner: input.owner,
    repo: input.repo,
    title: input.title,
    body: input.body,
  });
  return toIssue(data);
}

export async function listIssues(client: GitHubClient, input: ListIssuesInput): Promise<Issue[]> {
  const { data } = await client.rest.issues.listForRepo({
    owner: input.owner,
    repo: input.repo,
    state: input.state,
    per_page: input.per_page,
  });
  // La API de GitHub trata los pull requests como issues: los filtramos
  return data.filter((issue) => !issue.pull_request).map(toIssue);
}