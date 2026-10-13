import { describe, expect, it } from "vitest";
import {
  createCommitSchema,
  createIssueSchema,
  createRepositorySchema,
  listIssuesSchema,
  listRepositoriesSchema,
} from "../src/schemas/index.js";

/** Devuelve el primer mensaje de error de una validación fallida */
function firstError(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.error?.issues[0]?.message;
}

describe("createRepositorySchema", () => {
  it("acepta un nombre válido y completa los valores por defecto", () => {
    const result = createRepositorySchema.safeParse({ name: "mi-repo_1.0" });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ name: "mi-repo_1.0", private: false });
  });

  it("rechaza nombres con espacios con un mensaje claro", () => {
    const result = createRepositorySchema.safeParse({ name: "mi repo" });

    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("Sin espacios");
  });

  it("rechaza nombres de menos de 3 caracteres", () => {
    const result = createRepositorySchema.safeParse({ name: "ab" });

    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("El nombre del repositorio debe tener al menos 3 caracteres.");
  });

  it("rechaza nombres de más de 100 caracteres", () => {
    const result = createRepositorySchema.safeParse({ name: "a".repeat(101) });

    expect(result.success).toBe(false);
  });
});

describe("listRepositoriesSchema", () => {
  it("rechaza per_page mayor a 100, el límite de GitHub", () => {
    const result = listRepositoriesSchema.safeParse({ per_page: 500 });

    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("GitHub devuelve como máximo 100 repositorios por pedido.");
  });
});

describe("createIssueSchema", () => {
  it("limpia los espacios del título", () => {
    const result = createIssueSchema.parse({
      owner: "yahiralmendras22",
      repo: "mi-repo",
      title: "   Bug en el login   ",
    });

    expect(result.title).toBe("Bug en el login");
  });

  it("rechaza un título vacío", () => {
    const result = createIssueSchema.safeParse({ owner: "yahiralmendras22", repo: "mi-repo", title: "   " });

    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("El título del issue no puede estar vacío.");
  });
});

describe("listIssuesSchema", () => {
  it("lista solo issues abiertos por defecto", () => {
    const result = listIssuesSchema.parse({ owner: "yahiralmendras22", repo: "mi-repo" });

    expect(result.state).toBe("open");
    expect(result.per_page).toBe(30);
  });
});

describe("createCommitSchema", () => {
  const base = { owner: "yahiralmendras22", repo: "mi-repo", content: "hola", message: "Agregar notas" };

  it("acepta una ruta relativa", () => {
    expect(createCommitSchema.safeParse({ ...base, path: "docs/notas.md" }).success).toBe(true);
  });

  it("rechaza rutas que empiezan con '/'", () => {
    const result = createCommitSchema.safeParse({ ...base, path: "/README.md" });

    expect(result.success).toBe(false);
    expect(firstError(result)).toContain("relativa a la raíz");
  });

  it("rechaza rutas con '..'", () => {
    const result = createCommitSchema.safeParse({ ...base, path: "../secreto.txt" });

    expect(result.success).toBe(false);
    expect(firstError(result)).toBe("La ruta no puede contener '..'.");
  });
});