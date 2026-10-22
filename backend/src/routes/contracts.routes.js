// CRUD de contratos

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { validate, validateQuery, filtroOpcional } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { serializePayment } from "../lib/payment-status.js";
import { CONTRACT_STATUSES } from "../lib/enums.js";
import { money } from "../lib/money.js";
import { ownsClient, updateOwned, deleteOwned } from "../lib/ownership.js";

const router = Router();
router.use(authenticate);

const contractSchema = z.object({
  clientId: z.uuid("Cliente invalido"),
  title: z.string().trim().min(2, "Titulo muito curto").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  amount: z.coerce.number().nonnegative("Valor nao pode ser negativo"),
  status: z.enum(CONTRACT_STATUSES).default("PENDING"),
  dueDate: z.coerce.date().optional().nullable(),
});

// Decimal vai como string pra nao perder centavo
function serialize(contract) {
  return { ...contract, amount: money(contract.amount) };
}

const contractFiltersSchema = z.object({
  status: filtroOpcional(z.enum(CONTRACT_STATUSES, { error: "Situacao invalida" })),
  clientId: filtroOpcional(z.uuid("Cliente invalido")),
});

/* Total recebido por contrato num groupBy so */
async function paidByContract(userId, contractId) {
  const rows = await prisma.payment.groupBy({
    by: ["contractId"],
    where: {
      userId,
      paidAt: { not: null },
      ...(contractId ? { contractId } : {}),
    },
    _sum: { amount: true },
  });

  return new Map(rows.map((r) => [r.contractId, money(r._sum.amount)]));
}

// GET /contracts
router.get("/", validateQuery(contractFiltersSchema), async (req, res, next) => {
  try {
    const { status, clientId } = req.filtros;

    const [contracts, paid] = await Promise.all([
      prisma.contract.findMany({
        where: {
          userId: req.userId,
          ...(status ? { status } : {}),
          ...(clientId ? { clientId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true, company: true } } },
      }),
      paidByContract(req.userId),
    ]);

    return res.json({
      contracts: contracts.map((c) => ({
        ...serialize(c),
        paidAmount: paid.get(c.id) ?? "0",
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /contracts/stats (precisa vir antes de /:id)
router.get("/stats", async (req, res, next) => {
  try {
    const grouped = await prisma.contract.groupBy({
      by: ["status"],
      where: { userId: req.userId },
      _count: { _all: true },
      _sum: { amount: true },
    });

    const byStatus = Object.fromEntries(
      CONTRACT_STATUSES.map((s) => {
        const row = grouped.find((g) => g.status === s);
        return [
          s,
          {
            count: row?._count._all ?? 0,
            total: money(row?._sum.amount),
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

// POST /contracts
router.post("/", validate(contractSchema), async (req, res, next) => {
  try {
    const { clientId, ...rest } = req.body;

    // garante que o cliente e do usuario logado
    if (!(await ownsClient(clientId, req.userId))) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

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

// GET /contracts/:id
router.get("/:id", async (req, res, next) => {
  try {
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        client: { select: { id: true, name: true, company: true } },
        payments: { orderBy: { dueDate: "asc" } },
      },
    });

    if (!contract) return res.status(404).json({ error: "Contrato nao encontrado" });

    const payments = contract.payments.map((p) => serializePayment(p));

    // soma no banco, reduce com Decimal em JS da 6666.679999...
    const paid = await paidByContract(req.userId, contract.id);

    return res.json({
      contract: {
        ...serialize(contract),
        payments,
        paidAmount: paid.get(contract.id) ?? "0",
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /contracts/:id
router.put("/:id", validate(contractSchema), async (req, res, next) => {
  try {
    const { clientId, ...rest } = req.body;

    if (!(await ownsClient(clientId, req.userId))) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    const alterado = await updateOwned(prisma.contract, req.params.id, req.userId, {
      ...rest,
      description: rest.description || null,
      clientId,
    });

    if (!alterado) {
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

// DELETE /contracts/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (!(await deleteOwned(prisma.contract, req.params.id, req.userId))) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
