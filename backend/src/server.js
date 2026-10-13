// ============================================================
// server.js - ponto de entrada da aplicacao
// ------------------------------------------------------------
// Responsabilidade unica: carregar as variaveis de ambiente
// e ligar o app numa porta.
// ============================================================

// IMPORTANTE: esta linha vem PRIMEIRO.
// Ela le o arquivo .env e joga os valores em process.env.
// Como imports em ESM sao executados na ordem em que aparecem,
// o dotenv roda antes do app.js ser carregado - e por isso que
// process.env.CORS_ORIGIN ja existe la dentro.
import "dotenv/config";

import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";

import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  API do FreelaManager rodando`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Teste: http://localhost:${PORT}${process.env.API_PREFIX || ""}/health\n`);
});

// ------------------------------------------------------------
// DEMO PUBLICA: recria a conta de demonstracao todo dia
// ------------------------------------------------------------
// Na demo no ar, qualquer visitante pode editar ou apagar os
// dados de exemplo. Com DEMO_RESET=1, o seed roda ao ligar e a
// cada 24h - e, como as datas do seed sao relativas a hoje, os
// "proximos vencimentos" nunca envelhecem.
// Roda num processo separado porque o seed desconecta o Prisma
// ao terminar, e o servidor precisa continuar conectado.
if (process.env.DEMO_RESET === "1") {
  const seed = fileURLToPath(new URL("../prisma/seed-demo.mjs", import.meta.url));
  const recria = () =>
    execFile(process.execPath, [seed], (err) => {
      console.log(err ? `[demo] falhou ao recriar: ${err.message}` : "[demo] conta de demonstracao recriada");
    });
  recria();
  setInterval(recria, 24 * 60 * 60 * 1000).unref();
}
