// Roda uma vez antes dos testes. Le o .env e joga na
// process.env, do mesmo jeito que o server.js faz em producao.
import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL nao definida. Copie o .env.example para .env antes de rodar os testes."
  );
}
