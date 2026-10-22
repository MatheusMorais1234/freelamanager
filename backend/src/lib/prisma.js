
import { PrismaPg } from "@prisma/adapter-pg";
// Node 24 importa .ts direto
import { PrismaClient } from "../generated/prisma/client.ts";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

export const prisma = new PrismaClient({ adapter });
