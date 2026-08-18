-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'TRANSFER', 'BOLETO', 'CARD', 'CASH', 'OTHER');

-- AlterTable
ALTER TABLE "clients" ALTER COLUMN "updated_at" DROP DEFAULT;

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "contract_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "description" VARCHAR(160),
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" DATE NOT NULL,
    "paid_at" DATE,
    "method" "PaymentMethod",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "payments_user_id_idx" ON "payments"("user_id");

-- CreateIndex
CREATE INDEX "payments_contract_id_idx" ON "payments"("contract_id");

-- CreateIndex
CREATE INDEX "payments_due_date_idx" ON "payments"("due_date");

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_fkey" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
