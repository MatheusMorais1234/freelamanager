// Parcelas dos contratos

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { validate, validateQuery, filtroOpcional } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { serializePayment, startOfToday, paymentWhere } from "../lib/payment-status.js";
import { PAYMENT_METHODS, PAYMENT_STATUSES } from "../lib/enums.js";
import { money, box } from "../lib/money.js";
import { splitAmount, addMonths } from "../lib/installments.js";
import { ownsContract, updateOwned, deleteOwned } from "../lib/ownership.js";

const router = Router();
router.use(authenticate);

// FORMATO DE ENTRADA
const paymentSchema = z.object({
  contractId: z.uuid("Contrato invalido"),
  description: z.string().trim().max(160).optional().or(z.literal("")),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  dueDate: z.coerce.date({ error: "Informe o vencimento" }),
  paidAt: z.coerce.date().optional().nullable(),
  method: z.enum(PAYMENT_METHODS, { error: "Forma de pagamento invalida" }).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),

  // so na criacao: divide o valor em N parcelas mensais
  installments: z.coerce
    .number()
    .int()
    .min(1, "Minimo de 1 parcela")
    .max(60, "Maximo de 60 parcelas")
    .default(1),
});

const settleSchema = z.object({
  paid: z.boolean().default(true),
  paidAt: z.coerce.date().optional().nullable(),
  method: z.enum(PAYMENT_METHODS, { error: "Forma de pagamento invalida" }).optional().nullable(),
});

function serialize(payment) {
  const data = serializePayment(payment);

  if (!payment.contract) return data;

  return {
    ...data,
    contract: { ...payment.contract, amount: money(payment.contract.amount) },
  };
}

const contractPreview = {
  select: {
    id: true,
    title: true,
    amount: true,
    client: { select: { id: true, name: true, company: true } },
  },
};

// valida os ids aqui pra dar 400 em vez de 500 do Postgres
const paymentFiltersSchema = z.object({
  contractId: filtroOpcional(z.uuid("Contrato invalido")),
  clientId: filtroOpcional(z.uuid("Cliente invalido")),
  status: filtroOpcional(z.enum(PAYMENT_STATUSES, { error: "Situacao invalida" })),
});

// GET /payments
router.get("/", validateQuery(paymentFiltersSchema), async (req, res, next) => {
  try {
    // Express 5: req.query e read-only, filtros ficam em req.filtros
    const { contractId, clientId, status } = req.filtros;
    const today = startOfToday();

    const payments = await prisma.payment.findMany({
      where: {
        userId: req.userId,
        ...(contractId ? { contractId } : {}),
        ...(clientId ? { contract: { clientId } } : {}),
        ...paymentWhere(status, today),
      },
      // vencimento mais proximo primeiro
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { contract: contractPreview },
    });

    return res.json({ payments: payments.map((p) => serialize(p)) });
  } catch (err) {
    next(err);
  }
});

// GET /payments/summary (antes de /:id)
router.get("/summary", async (req, res, next) => {
  try {
    const today = startOfToday();
    const base = { userId: req.userId };

    const [paid, pending, overdue] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...base, ...paymentWhere("PAID", today) },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { ...base, ...paymentWhere("PENDING", today) },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { ...base, ...paymentWhere("OVERDUE", today) },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    // recebido por mes p/ o grafico (prisma nao agrupa por mes)
    const since = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));

    const received = await prisma.payment.findMany({
      where: { ...base, paidAt: { gte: since } },
      select: { amount: true, paidAt: true },
    });

    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5 + i, 1));
      return { key: d.toISOString().slice(0, 7), total: 0 };
    });

    for (const p of received) {
      const bucket = months.find((m) => m.key === p.paidAt.toISOString().slice(0, 7));
      if (bucket) bucket.total += Number(p.amount);
    }

    return res.json({
      summary: {
        paid: box(paid),
        pending: box(pending),
        overdue: box(overdue),
        monthly: months.map((m) => ({ ...m, total: m.total.toFixed(2) })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /payments
router.post("/", validate(paymentSchema), async (req, res, next) => {
  try {
    const { contractId, installments, amount, dueDate, description, ...rest } = req.body;

    if (!(await ownsContract(contractId, req.userId))) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    const values = splitAmount(amount, installments);

    const data = values.map((value, i) => ({
      contractId,
      userId: req.userId,
      amount: value,
      dueDate: addMonths(dueDate, i),
      description:
        installments > 1
          ? `${description || "Parcela"} ${i + 1}/${installments}`
          : description || null,
      notes: rest.notes || null,
      // so a primeira pode nascer paga (entrada)
      paidAt: i === 0 ? rest.paidAt || null : null,
      method: i === 0 && rest.paidAt ? rest.method || null : null,
    }));

    const created = await prisma.payment.createManyAndReturn({ data });

    // createManyAndReturn nao traz as relacoes
    const payments = await prisma.payment.findMany({
      where: { id: { in: created.map((p) => p.id) } },
      orderBy: { dueDate: "asc" },
      include: { contract: contractPreview },
    });

    return res.status(201).json({ payments: payments.map((p) => serialize(p)) });
  } catch (err) {
    next(err);
  }
});

// GET /payments/:id
router.get("/:id", async (req, res, next) => {
  try {
    const payment = await prisma.payment.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { contract: contractPreview },
    });

    if (!payment) return res.status(404).json({ error: "Pagamento nao encontrado" });

    return res.json({ payment: serialize(payment) });
  } catch (err) {
    next(err);
  }
});

// PUT /payments/:id
router.put("/:id", validate(paymentSchema), async (req, res, next) => {
  try {
    const { contractId, amount, dueDate, description, ...rest } = req.body;

    if (!(await ownsContract(contractId, req.userId))) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    const alterado = await updateOwned(prisma.payment, req.params.id, req.userId, {
      contractId,
      amount,
      dueDate,
      description: description || null,
      notes: rest.notes || null,
      paidAt: rest.paidAt || null,
      // sem recebimento nao tem forma de pagamento
      method: rest.paidAt ? rest.method || null : null,
    });

    if (!alterado) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { contract: contractPreview },
    });

    return res.json({ payment: serialize(payment) });
  } catch (err) {
    next(err);
  }
});

// PATCH /payments/:id/settle - marca recebido/desfaz
router.patch("/:id/settle", validate(settleSchema), async (req, res, next) => {
  try {
    const { paid, paidAt, method } = req.body;

    const alterado = await updateOwned(
      prisma.payment,
      req.params.id,
      req.userId,
      paid
        ? { paidAt: paidAt || startOfToday(), method: method || null }
        : { paidAt: null, method: null }
    );

    if (!alterado) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { contract: contractPreview },
    });

    return res.json({ payment: serialize(payment) });
  } catch (err) {
    next(err);
  }
});

// DELETE /payments/:id
router.delete("/:id", async (req, res, next) => {
  try {
    if (!(await deleteOwned(prisma.payment, req.params.id, req.userId))) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
