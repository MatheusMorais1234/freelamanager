// ============================================================
// Conexao unica com o banco (singleton)
// ------------------------------------------------------------
// Todo o app importa ESTA instancia. Criar um PrismaClient novo
// a cada arquivo abriria varios pools de conexao com o Postgres
// e estouraria o limite de conexoes.
// ============================================================

import { PrismaPg } from "@prisma/adapter-pg";
// O Prisma 7 gera o cliente em TypeScript. O Node 24 le .ts
// nativamente (remove os tipos na hora de carregar), entao
// importamos o arquivo .ts direto - sem build, sem compilador.
import { PrismaClient } from "../generated/prisma/client.ts";

// Prisma 7 exige um "driver adapter" para conectar.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
