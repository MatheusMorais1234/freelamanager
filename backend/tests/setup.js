import "dotenv/config";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL nao definida. Copie o .env.example para .env antes de rodar os testes."
  );
}
