-- ============================================================
-- Cadastro completo de cliente: PF/PJ, documento, endereco
-- ============================================================

-- CreateEnum
CREATE TYPE "ClientType" AS ENUM ('PERSON', 'COMPANY');

-- AlterTable
-- ATENCAO ao "updated_at": a coluna e NOT NULL, entao precisa de
-- um DEFAULT para as linhas que JA existem na tabela. Sem ele o
-- Postgres nao sabe o que gravar nos clientes antigos e o ALTER
-- falha. O Prisma continua preenchendo o valor a cada escrita
-- por causa do @updatedAt.
ALTER TABLE "clients"
  ADD COLUMN "type" "ClientType" NOT NULL DEFAULT 'PERSON',
  ADD COLUMN "document" VARCHAR(14),
  ADD COLUMN "state_registration" VARCHAR(20),
  ADD COLUMN "birth_date" DATE,
  ADD COLUMN "mobile" VARCHAR(20),
  ADD COLUMN "website" VARCHAR(180),
  ADD COLUMN "zip_code" VARCHAR(8),
  ADD COLUMN "street" VARCHAR(160),
  ADD COLUMN "number" VARCHAR(20),
  ADD COLUMN "complement" VARCHAR(80),
  ADD COLUMN "district" VARCHAR(80),
  ADD COLUMN "city" VARCHAR(80),
  ADD COLUMN "state" VARCHAR(2),
  ADD COLUMN "notes" TEXT,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20);

-- CreateIndex
-- Unicidade COMPOSTA: o mesmo CPF/CNPJ nao se repete para um
-- usuario, mas dois freelancers podem ter o mesmo cliente.
-- No Postgres, valores NULL nao conflitam entre si, entao
-- varios clientes sem documento continuam permitidos.
CREATE UNIQUE INDEX "clients_user_id_document_key" ON "clients"("user_id", "document");
