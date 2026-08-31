// ============================================================
// Configuracao dos testes
// ------------------------------------------------------------
// Os testes sobem o Express de verdade (via supertest) e falam
// com o Postgres de verdade. Sao testes de INTEGRACAO de
// proposito: o que este projeto precisa provar - isolamento
// entre usuarios, digito verificador, centavos do parcelamento -
// so acontece de fato quando o banco esta no meio. Trocar o
// Prisma por um dublê testaria o dublê, nao o sistema.
// ============================================================

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Carrega o .env antes de qualquer teste: o cliente do
    // Prisma precisa da DATABASE_URL no momento em que e criado.
    setupFiles: ["./tests/setup.js"],

    // Um processo so. Os testes compartilham o mesmo banco, e
    // rodar arquivos em paralelo deixaria as contagens
    // ("quantos clientes existem") disputando entre si.
    fileParallelism: false,

    // Subir o Express e falar com o banco leva mais que os 5s
    // padrao em maquina fria.
    testTimeout: 20000,
  },
});
