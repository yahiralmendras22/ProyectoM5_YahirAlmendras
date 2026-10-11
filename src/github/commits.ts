import type { GitHubClient } from "./client.js";
import type { Commit, CreateCommitInput } from "../schemas/index.js";

function isNotFoundError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "status" in error && error.status === 404;
}

/**
 * Devuelve el SHA del archivo si ya existe, o undefined si no existe.
 * GitHub exige ese SHA para MODIFICAR un archivo (evita pisar cambios ajenos).
 */
async function getFileSha(
  client: GitHubClient,
  input: Pick<CreateCommitInput, "owner" | "repo" | "path" | "branch">,
): Promise<string | undefined> {
  try {
    const { data } = await client.rest.repos.getContent({
      owner: input.owner,
      repo: input.repo,
      path: input.path,
      ref: input.branch,
    });
    if (Array.isArray(data) || data.type !== "file") {
      throw new Error(`La ruta "${input.path}" no es un archivo (es una carpeta u otro tipo de elemento).`);
    }
    return data.sha;
  } catch (error) {
    if (isNotFoundError(error)) return undefined;
    throw error;
  }
}

export async function createCommit(client: GitHubClient, input: CreateCommitInput): Promise<Commit> {
  const existingSha = await getFileSha(client, input);

  const { data } = await client.rest.repos.createOrUpdateFileContents({
    owner: input.owner,
    repo: input.repo,
    path: input.path,
    message: input.message,
    content: Buffer.from(input.content, "utf8").toString("base64"),
    sha: existingSha,
    branch: input.branch,
  });

  return {
    sha: data.commit.sha ?? "",
    message: data.commit.message ?? input.message,
    url: data.commit.html_url ?? `https://github.com/${input.owner}/${input.repo}`,
    path: input.path,
    created: existingSha === undefined,
  };
}