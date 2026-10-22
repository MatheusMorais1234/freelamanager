// Testes de integracao: supertest + Postgres real

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./tests/setup.js"],

    // um processo so, os testes dividem o mesmo banco
    fileParallelism: false,

    testTimeout: 20000,
  },
});
