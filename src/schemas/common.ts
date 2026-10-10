import * as z from "zod";

// ---------- Campos reutilizables ----------

export const ownerSchema = z
  .string()
  .trim()
  .min(1, "El dueño del repositorio no puede estar vacío.")
  .max(39, "Un usuario u organización de GitHub tiene como máximo 39 caracteres.")
  .regex(/^[a-zA-Z0-9-]+$/, {
    message: "El dueño solo puede contener letras, números y guiones medios.",
  })
  .describe("Usuario u organización dueña del repositorio (ej: 'yahiralmendras22')");

export const repoNameSchema = z
  .string()
  .trim()
  .min(3, "El nombre del repositorio debe tener al menos 3 caracteres.")
  .max(100, "El nombre del repositorio puede tener como máximo 100 caracteres.")
  .regex(/^[a-zA-Z0-9_.-]+$/, {
    message:
      "El nombre solo puede contener letras, números, guiones bajos, puntos y guiones medios. Sin espacios.",
  });