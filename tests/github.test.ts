import { beforeEach, describe, expect, it, vi } from "vitest";
import type { GitHubClient } from "../src/github/client.js";
import { createCommit, createIssue, listIssues, listRepositories } from "../src/github/operations.js";

// vi.mock reemplaza el módulo @octokit/rest por una versión falsa.
// Así comprobamos que createGitHubClient configura bien Octokit sin conectarse a GitHub.
vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation((options: unknown) => ({ options })),
}));

/** Crea un error con la misma forma que los que tira Octokit */
function httpError(status: number) {
  return Object.assign(new Error(`HTTP ${status}`), { status, response: { headers: {}, data: {} } });
}

/**
 * Cliente de GitHub falso: cada método es un vi.fn() que controlamos en cada test.
 * Solo implementa los métodos que usan las operaciones.
 */
function createMockClient() {
  return {
    rest: {
      repos: {
        listForAuthenticatedUser: vi.fn(),
        createForAuthenticatedUser: vi.fn(),
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
      },
      issues: {
        create: vi.fn(),
        listForRepo: vi.fn(),
      },
    },
  };
}

let mock: ReturnType<typeof createMockClient>;
let client: GitHubClient;

beforeEach(() => {
  mock = createMockClient();
  client = mock as unknown as GitHubClient;
});

describe("createGitHubClient", () => {
  it("crea Octokit autenticado con el token", async () => {
    const { Octokit } = await import("@octokit/rest");
    const { createGitHubClient } = await import("../src/github/client.js");

    createGitHubClient("ghp_token_de_prueba");

    expect(Octokit).toHaveBeenCalledWith(expect.objectContaining({ auth: "ghp_token_de_prueba" }));
  });
});

describe("listRepositories", () => {
  it("mapea la respuesta de GitHub al formato del dominio", async () => {
    mock.rest.repos.listForAuthenticatedUser.mockResolvedValue({
      data: [
        {
          full_name: "yahir/mi-repo",
          html_url: "https://github.com/yahir/mi-repo",
          url: "https://api.github.com/repos/yahir/mi-repo",
          private: false,
          description: null,
          owner: { login: "yahir", id: 1 },
        },
      ],
    });

    const repos = await listRepositories(client, { type: "all", sort: "updated", per_page: 30 });

    expect(repos).toEqual([
      {
        full_name: "yahir/mi-repo",
        url: "https://github.com/yahir/mi-repo",
        private: false,
        description: null,
        owner: "yahir",
      },
    ]);
    expect(mock.rest.repos.listForAuthenticatedUser).toHaveBeenCalledWith({
      type: "all",
      sort: "updated",
      per_page: 30,
    });
  });
});

describe("createIssue", () => {
  it("crea el issue y normaliza las etiquetas", async () => {
    mock.rest.issues.create.mockResolvedValue({
      data: {
        number: 7,
        title: "Bug en el login",
        state: "open",
        html_url: "https://github.com/yahir/mi-repo/issues/7",
        user: { login: "yahir" },
        labels: ["bug", { name: "urgente" }],
        created_at: "2026-10-13T12:00:00Z",
      },
    });

    const issue = await createIssue(client, { owner: "yahir", repo: "mi-repo", title: "Bug en el login" });

    expect(issue.number).toBe(7);
    expect(issue.labels).toEqual(["bug", "urgente"]);
    expect(issue.author).toBe("yahir");
  });

  it("propaga el error cuando el repositorio no existe (404)", async () => {
    mock.rest.issues.create.mockRejectedValue(httpError(404));

    await expect(
      createIssue(client, { owner: "yahir", repo: "no-existe", title: "Bug" }),
    ).rejects.toMatchObject({ status: 404 });
  });
});

describe("listIssues", () => {
  it("excluye los pull requests del listado", async () => {
    mock.rest.issues.listForRepo.mockResolvedValue({
      data: [
        { number: 1, title: "Issue real", state: "open", html_url: "https://github.com/a/b/issues/1", user: null, labels: [], created_at: "x" },
        { number: 2, title: "Un PR", state: "open", html_url: "https://github.com/a/b/pull/2", user: null, labels: [], created_at: "x", pull_request: {} },
      ],
    });

    const issues = await listIssues(client, { owner: "a", repo: "bbb", state: "open", per_page: 30 });

    expect(issues).toHaveLength(1);
    expect(issues[0]?.title).toBe("Issue real");
  });
});

describe("createCommit", () => {
  const input = { owner: "yahir", repo: "mi-repo", path: "README.md", content: "hola", message: "Agregar README" };
  const commitResponse = {
    data: { commit: { sha: "abc123", message: "Agregar README", html_url: "https://github.com/yahir/mi-repo/commit/abc123" } },
  };

  it("crea el archivo si no existe, sin enviar sha y con el contenido en Base64", async () => {
    mock.rest.repos.getContent.mockRejectedValue(httpError(404));
    mock.rest.repos.createOrUpdateFileContents.mockResolvedValue(commitResponse);

    const commit = await createCommit(client, input);

    expect(commit.created).toBe(true);
    expect(mock.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ content: "aG9sYQ==", sha: undefined }),
    );
  });

  it("modifica el archivo si existe, enviando su sha actual", async () => {
    mock.rest.repos.getContent.mockResolvedValue({ data: { type: "file", sha: "sha-viejo" } });
    mock.rest.repos.createOrUpdateFileContents.mockResolvedValue(commitResponse);

    const commit = await createCommit(client, input);

    expect(commit.created).toBe(false);
    expect(mock.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
      expect.objectContaining({ sha: "sha-viejo" }),
    );
  });

  it("no hace el commit si la ruta es una carpeta", async () => {
    mock.rest.repos.getContent.mockResolvedValue({ data: [] });

    await expect(createCommit(client, { ...input, path: "src" })).rejects.toThrow("no es un archivo");
    expect(mock.rest.repos.createOrUpdateFileContents).not.toHaveBeenCalled();
  });
});