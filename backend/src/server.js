
// dotenv precisa vir antes do app.js
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

// Demo publica: com DEMO_RESET=1 recria a conta demo ao subir e a cada 24h.\nRoda em outro processo porque o seed desconecta o prisma no final.
if (process.env.DEMO_RESET === "1") {
  const seed = fileURLToPath(new URL("../prisma/seed-demo.mjs", import.meta.url));
  const recria = () =>
    execFile(process.execPath, [seed], (err) => {
      console.log(err ? `[demo] falhou ao recriar: ${err.message}` : "[demo] conta de demonstracao recriada");
    });
  recria();
  setInterval(recria, 24 * 60 * 60 * 1000).unref();
}
