import type { GitHubClient } from "./client.js";
import type {
  CreateRepositoryInput,
  ListRepositoriesInput,
  Repository,
} from "../schemas/index.js";

interface GitHubRepoResponse {
  full_name: string;
  html_url: string;
  private: boolean;
  description: string | null;
  owner: { login: string };
}

function toRepository(repo: GitHubRepoResponse): Repository {
  return {
    full_name: repo.full_name,
    url: repo.html_url,
    private: repo.private,
    description: repo.description,
    owner: repo.owner.login,
  };
}

export async function listRepositories(
  client: GitHubClient,
  input: ListRepositoriesInput,
): Promise<Repository[]> {
  const { data } = await client.rest.repos.listForAuthenticatedUser({
    type: input.type,
    sort: input.sort,
    per_page: input.per_page,
  });
  return data.map(toRepository);
}

export async function createRepository(
  client: GitHubClient,
  input: CreateRepositoryInput,
): Promise<Repository> {
  const { data } = await client.rest.repos.createForAuthenticatedUser({
    name: input.name,
    description: input.description,
    private: input.private,
  });
  return toRepository(data);
}