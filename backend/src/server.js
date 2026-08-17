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

import app from "./app.js";

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`\n  API do FreelaManager rodando`);
  console.log(`  http://localhost:${PORT}`);
  console.log(`  Teste: http://localhost:${PORT}/health\n`);
});
