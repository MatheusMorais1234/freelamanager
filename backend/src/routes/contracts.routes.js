// ============================================================
// Rotas de contratos (CRUD) - todas protegidas
//   GET    /contracts       lista (aceita ?status= e ?clientId=)
//   GET    /contracts/stats resumo para o dashboard
//   POST   /contracts       cria
//   GET    /contracts/:id   detalhe
//   PUT    /contracts/:id   atualiza
//   DELETE /contracts/:id   remove
// ============================================================

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();
router.use(authenticate);

const STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];

const contractSchema = z.object({
  clientId: z.uuid("Cliente invalido"),
  title: z.string().trim().min(2, "Titulo muito curto").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // coerce: aceita "1500.50" vindo do formulario e converte em numero
  amount: z.coerce.number().nonnegative("Valor nao pode ser negativo"),
  status: z.enum(STATUSES).default("PENDING"),
  dueDate: z.coerce.date().optional().nullable(),
});

// O Prisma devolve Decimal como objeto (para nao perder precisao).
// JSON nao tem tipo decimal, entao mandamos como STRING - o
// frontend formata. Numero em ponto flutuante estragaria centavos.
function serialize(contract) {
  return { ...contract, amount: contract.amount.toString() };
}

// ------------------------------------------------------------
// GET /contracts
// ------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { status, clientId } = req.query;

    const contracts = await prisma.contract.findMany({
      where: {
        userId: req.userId,
        ...(STATUSES.includes(status) ? { status } : {}),
        ...(clientId ? { clientId } : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    return res.json({ contracts: contracts.map(serialize) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /contracts/stats
// ------------------------------------------------------------
// ATENCAO: esta rota vem ANTES de "/:id". Se viesse depois, o
// Express casaria "stats" como se fosse um id.
router.get("/stats", async (req, res, next) => {
  try {
    // groupBy faz a soma no BANCO, nao em JavaScript.
    // Somar no banco e muito mais rapido do que baixar
    // todos os contratos e somar aqui.
    const grouped = await prisma.contract.groupBy({
      by: ["status"],
      where: { userId: req.userId },
      _count: { _all: true },
      _sum: { amount: true },
    });

    const byStatus = Object.fromEntries(
      STATUSES.map((s) => {
        const row = grouped.find((g) => g.status === s);
        return [
          s,
          {
            count: row?._count._all ?? 0,
            total: (row?._sum.amount ?? 0).toString(),
          },
        ];
      })
    );

    const totalContracts = grouped.reduce((acc, g) => acc + g._count._all, 0);
    const totalClients = await prisma.client.count({ where: { userId: req.userId } });

    return res.json({ stats: { totalContracts, totalClients, byStatus } });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /contracts
// ------------------------------------------------------------
router.post("/", validate(contractSchema), async (req, res, next) => {
  try {
    const { clientId, ...rest } = req.body;

    // Aqui esta a validacao que o user_id "extra" na tabela exige:
    // confirmamos que o cliente informado pertence mesmo a quem
    // esta logado, antes de gravar os dois ids juntos.
    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
      select: { id: true },
    });

    if (!client) return res.status(404).json({ error: "Cliente nao encontrado" });

    const contract = await prisma.contract.create({
      data: {
        ...rest,
        description: rest.description || null,
        clientId,
        userId: req.userId,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    return res.status(201).json({ contract: serialize(contract) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /contracts/:id
// ------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    if (!contract) return res.status(404).json({ error: "Contrato nao encontrado" });

    return res.json({ contract: serialize(contract) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// PUT /contracts/:id
// ------------------------------------------------------------
router.put("/:id", validate(contractSchema), async (req, res, next) => {
  try {
    const { clientId, ...rest } = req.body;

    const client = await prisma.client.findFirst({
      where: { id: clientId, userId: req.userId },
      select: { id: true },
    });
    if (!client) return res.status(404).json({ error: "Cliente nao encontrado" });

    const result = await prisma.contract.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: { ...rest, description: rest.description || null, clientId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    return res.json({ contract: serialize(contract) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// DELETE /contracts/:id
// ------------------------------------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await prisma.contract.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
