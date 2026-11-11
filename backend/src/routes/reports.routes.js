// GET /reports?from=&to=
// Recebido filtra por paidAt; a receber e atrasado, por dueDate.
// Parcela que venceu em jan e foi paga em mar conta como recebida em mar.

import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { startOfToday } from "../lib/payment-status.js";
import { PAYMENT_METHODS } from "../lib/enums.js";
import { box } from "../lib/money.js";

const router = Router();
router.use(authenticate);

/* "AAAA-MM-DD" -> Date, ou null se invalida */
function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/* Periodo pedido ou mes atual. Fim vai ate 23:59:59.999 pq as colunas sao so data. */
function resolvePeriod(query) {
  const hoje = startOfToday();

  const from =
    parseDate(query.from) ??
    new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), 1));

  const to =
    parseDate(query.to) ??
    new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0));

  const fim = new Date(to);
  fim.setUTCHours(23, 59, 59, 999);

  // datas invertidas: so troca
  if (from > fim) return { from: fim, to: from, invertido: true };

  return { from, to: fim, invertido: false };
}

// GET /reports
router.get("/", async (req, res, next) => {
  try {
    const { from, to, invertido } = resolvePeriod(req.query);
    const hoje = startOfToday();
    const base = { userId: req.userId };

    const recebidoNoPeriodo = { ...base, paidAt: { gte: from, lte: to } };
    const emAberto = { ...base, paidAt: null, dueDate: { gte: from, lte: to } };

    const inicioAVencer = from > hoje ? from : hoje;
    const fimAtrasado = to < hoje ? to : hoje;

    const [recebido, aVencer, atrasado, porMetodo, parcelasRecebidas, parcelasAbertas] =
      await Promise.all([
        prisma.payment.aggregate({
          where: recebidoNoPeriodo,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // em aberto e ainda nao venceu
        prisma.payment.aggregate({
          where: { ...base, paidAt: null, dueDate: { gte: inicioAVencer, lte: to } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // em aberto e ja venceu
        prisma.payment.aggregate({
          where: { ...base, paidAt: null, dueDate: { gte: from, lt: fimAtrasado } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.payment.groupBy({
          by: ["method"],
          where: recebidoNoPeriodo,
          _sum: { amount: true },
          _count: { _all: true },
        }),

        // agrupa por cliente/mes em JS mesmo, a janela e pequena
        prisma.payment.findMany({
          where: recebidoNoPeriodo,
          select: {
            amount: true,
            paidAt: true,
            contract: {
              select: {
                id: true,
                client: { select: { id: true, name: true, company: true } },
              },
            },
          },
        }),
        prisma.payment.findMany({
          where: emAberto,
          select: {
            amount: true,
            dueDate: true,
            contract: {
              select: {
                id: true,
                client: { select: { id: true, name: true, company: true } },
              },
            },
          },
        }),
      ]);

    // por cliente
    const clientes = new Map();

    function bucketDoCliente(cliente) {
      if (!clientes.has(cliente.id)) {
        clientes.set(cliente.id, {
          id: cliente.id,
          name: cliente.name,
          company: cliente.company,
          received: 0,
          pending: 0,
          overdue: 0,
          contracts: new Set(),
        });
      }
      return clientes.get(cliente.id);
    }

    for (const p of parcelasRecebidas) {
      const b = bucketDoCliente(p.contract.client);
      b.received += Number(p.amount);
      b.contracts.add(p.contract.id);
    }

    for (const p of parcelasAbertas) {
      const b = bucketDoCliente(p.contract.client);
      if (p.dueDate < hoje) b.overdue += Number(p.amount);
      else b.pending += Number(p.amount);
      b.contracts.add(p.contract.id);
    }

    const byClient = [...clientes.values()]
      .map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
        received: c.received.toFixed(2),
        pending: c.pending.toFixed(2),
        overdue: c.overdue.toFixed(2),
        contracts: c.contracts.size,
      }))
      .sort((a, b) => Number(b.received) - Number(a.received));

    // por mes
    const meses = new Map();

    for (const p of parcelasRecebidas) {
      const chave = p.paidAt.toISOString().slice(0, 7); // "2026-08"
      meses.set(chave, (meses.get(chave) ?? 0) + Number(p.amount));
    }

    const monthly = [...meses.entries()]
      .map(([key, total]) => ({ key, total: total.toFixed(2) }))
      .sort((a, b) => a.key.localeCompare(b.key));

    // sem forma anotada vira OTHER pra bater com o total
    const metodos = new Map(PAYMENT_METHODS.map((m) => [m, { total: 0, count: 0 }]));

    for (const linha of porMetodo) {
      const chave = PAYMENT_METHODS.includes(linha.method) ? linha.method : "OTHER";
      const atual = metodos.get(chave);
      atual.total += Number(linha._sum.amount ?? 0);
      atual.count += linha._count._all;
    }

    const byMethod = [...metodos.entries()]
      .map(([method, v]) => ({ method, total: v.total.toFixed(2), count: v.count }))
      .filter((m) => m.count > 0)
      .sort((a, b) => Number(b.total) - Number(a.total));

    return res.json({
      report: {
        period: {
          from: from.toISOString().slice(0, 10),
          to: to.toISOString().slice(0, 10),
          swapped: invertido,
        },
        totals: {
          received: box(recebido),
          pending: box(aVencer),
          overdue: box(atrasado),
        },
        byClient,
        byMethod,
        monthly,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
