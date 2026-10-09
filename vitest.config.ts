import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // Cada test arranca con los mocks limpios: evita que un test contamine a otro
    clearMocks: true,
    restoreMocks: true,
  },
});