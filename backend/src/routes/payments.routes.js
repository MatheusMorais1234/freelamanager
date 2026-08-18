// ============================================================
// Rotas de pagamentos (parcelas de um contrato) - protegidas
//   GET    /payments             lista (?contractId= ?clientId= ?status=)
//   GET    /payments/summary     recebido / a receber / atrasado
//   POST   /payments             cria (uma parcela ou varias)
//   GET    /payments/:id         detalhe
//   PUT    /payments/:id         atualiza
//   PATCH  /payments/:id/settle  marca como recebido (ou desfaz)
//   DELETE /payments/:id         remove
// ============================================================

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
// A regra de "a receber / recebido / atrasado" mora numa lib
// propria porque o detalhe do contrato tambem precisa dela.
import { serializePayment, startOfToday } from "../lib/payment-status.js";

const router = Router();
router.use(authenticate);

const METHODS = ["PIX", "TRANSFER", "BOLETO", "CARD", "CASH", "OTHER"];
const STATUSES = ["PENDING", "PAID", "OVERDUE"];

// ------------------------------------------------------------
// FORMATO DE ENTRADA
// ------------------------------------------------------------
const paymentSchema = z.object({
  contractId: z.uuid("Contrato invalido"),
  description: z.string().trim().max(160).optional().or(z.literal("")),
  amount: z.coerce.number().positive("Valor deve ser maior que zero"),
  dueDate: z.coerce.date({ error: "Informe o vencimento" }),
  paidAt: z.coerce.date().optional().nullable(),
  method: z.enum(METHODS, { error: "Forma de pagamento invalida" }).optional().nullable(),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),

  // So na CRIACAO: quebra o valor em N parcelas mensais.
  // O PUT ignora este campo - editar uma parcela nao pode
  // multiplica-la em varias.
  installments: z.coerce
    .number()
    .int()
    .min(1, "Minimo de 1 parcela")
    .max(60, "Maximo de 60 parcelas")
    .default(1),
});

// Recebimento rapido: a data e a forma. O "paid: false" desfaz.
const settleSchema = z.object({
  paid: z.boolean().default(true),
  paidAt: z.coerce.date().optional().nullable(),
  method: z.enum(METHODS, { error: "Forma de pagamento invalida" }).optional().nullable(),
});

// Sobre a parcela ja serializada (valor em string + status
// derivado), so falta converter o Decimal do contrato que vem
// junto na listagem.
function serialize(payment) {
  const data = serializePayment(payment);

  if (!payment.contract) return data;

  return {
    ...data,
    contract: { ...payment.contract, amount: payment.contract.amount.toString() },
  };
}

// Dados do contrato (e do cliente) que acompanham cada parcela
// na listagem, para a tabela nao precisar de uma segunda chamada.
const contractPreview = {
  select: {
    id: true,
    title: true,
    amount: true,
    client: { select: { id: true, name: true, company: true } },
  },
};

/**
 * Divide um total em N parcelas SEM PERDER CENTAVO.
 * Trabalha em centavos (inteiros) porque 100 / 3 em ponto
 * flutuante daria 33.33 tres vezes = 99.99, sumindo um centavo.
 * A sobra vai para a primeira parcela.
 */
function splitAmount(total, parts) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const rest = cents - base * parts;

  return Array.from({ length: parts }, (_, i) => (base + (i === 0 ? rest : 0)) / 100);
}

/** Mesma data, N meses adiante. Dia 31 em mes curto cai no ultimo dia. */
function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();

  // Vai para o dia 1 ANTES de trocar o mes: sem isso, 31/01 + 1
  // mes viraria 03/03, porque "31 de fevereiro" transborda.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));

  return d;
}

/** Confere que o contrato existe E pertence a quem esta logado. */
async function ownContract(contractId, userId) {
  return prisma.contract.findFirst({
    where: { id: contractId, userId },
    select: { id: true },
  });
}

// ------------------------------------------------------------
// GET /payments
// ------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { contractId, clientId, status } = req.query;
    const today = startOfToday();

    // O filtro de status vira condicao de BANCO, e nao um
    // filter() em JavaScript depois: assim a contagem e a ordem
    // continuam corretas quando a lista crescer.
    const byStatus = {
      PAID: { paidAt: { not: null } },
      PENDING: { paidAt: null, dueDate: { gte: today } },
      OVERDUE: { paidAt: null, dueDate: { lt: today } },
    };

    const payments = await prisma.payment.findMany({
      where: {
        userId: req.userId,
        ...(contractId ? { contractId } : {}),
        // Filtrar por cliente atravessa a relacao: pagamento ->
        // contrato -> cliente. Nao precisamos de clientId na
        // tabela de pagamentos para isso.
        ...(clientId ? { contract: { clientId } } : {}),
        ...(STATUSES.includes(status) ? byStatus[status] : {}),
      },
      // Vencimento crescente: o que precisa de atencao primeiro
      // aparece no topo, que e como se olha uma lista de contas.
      orderBy: [{ dueDate: "asc" }, { createdAt: "asc" }],
      include: { contract: contractPreview },
    });

    return res.json({ payments: payments.map((p) => serialize(p)) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /payments/summary
// ------------------------------------------------------------
// Vem ANTES de "/:id", senao o Express leria "summary" como id.
router.get("/summary", async (req, res, next) => {
  try {
    const today = startOfToday();
    const base = { userId: req.userId };

    // Tres somas feitas NO BANCO, em paralelo. Baixar todas as
    // parcelas para somar em JavaScript seria mais lento e
    // gastaria memoria a toa.
    const [paid, pending, overdue] = await Promise.all([
      prisma.payment.aggregate({
        where: { ...base, paidAt: { not: null } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { ...base, paidAt: null, dueDate: { gte: today } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      prisma.payment.aggregate({
        where: { ...base, paidAt: null, dueDate: { lt: today } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
    ]);

    // Recebido mes a mes, para o grafico do painel.
    // Aqui SIM buscamos as linhas: o Prisma nao sabe agrupar por
    // "mes" de uma data, e a janela e curta (6 meses de parcelas
    // ja recebidas), entao o custo e pequeno e o codigo fica
    // legivel sem escrever SQL cru.
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
      // "2026-08-14" -> "2026-08": a chave do mes.
      const bucket = months.find((m) => m.key === p.paidAt.toISOString().slice(0, 7));
      if (bucket) bucket.total += Number(p.amount);
    }

    const box = (agg) => ({
      count: agg._count._all,
      total: (agg._sum.amount ?? 0).toString(),
    });

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

// ------------------------------------------------------------
// POST /payments
// ------------------------------------------------------------
router.post("/", validate(paymentSchema), async (req, res, next) => {
  try {
    const { contractId, installments, amount, dueDate, description, ...rest } = req.body;

    if (!(await ownContract(contractId, req.userId))) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    const values = splitAmount(amount, installments);

    const data = values.map((value, i) => ({
      contractId,
      userId: req.userId,
      amount: value,
      dueDate: addMonths(dueDate, i),
      // Numerar so quando ha mais de uma: "Parcela 1/1" e ruido.
      description:
        installments > 1
          ? `${description || "Parcela"} ${i + 1}/${installments}`
          : description || null,
      notes: rest.notes || null,
      // Uma parcela nasce em aberto. Ja marcar como recebida so
      // faz sentido para a primeira (o caso da entrada paga na
      // assinatura do contrato).
      paidAt: i === 0 ? rest.paidAt || null : null,
      method: i === 0 && rest.paidAt ? rest.method || null : null,
    }));

    // createManyAndReturn grava tudo numa transacao unica: ou
    // todas as parcelas entram, ou nenhuma. Um erro no meio nao
    // deixa metade do parcelamento gravado.
    const created = await prisma.payment.createManyAndReturn({ data });

    // Segunda consulta so para trazer contrato e cliente juntos -
    // createManyAndReturn devolve as linhas cruas, sem relacoes.
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

// ------------------------------------------------------------
// GET /payments/:id
// ------------------------------------------------------------
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

// ------------------------------------------------------------
// PUT /payments/:id
// ------------------------------------------------------------
router.put("/:id", validate(paymentSchema), async (req, res, next) => {
  try {
    const { contractId, amount, dueDate, description, ...rest } = req.body;

    if (!(await ownContract(contractId, req.userId))) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    // updateMany com userId no where: se a parcela for de outro
    // usuario, count volta 0 e respondemos 404 - sem confirmar
    // que aquele id existe.
    const result = await prisma.payment.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: {
        contractId,
        amount,
        dueDate,
        description: description || null,
        notes: rest.notes || null,
        paidAt: rest.paidAt || null,
        // Forma de pagamento sem recebimento nao existe: se a
        // parcela voltou a ficar em aberto, o metodo sai junto.
        method: rest.paidAt ? rest.method || null : null,
      },
    });

    if (result.count === 0) {
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

// ------------------------------------------------------------
// PATCH /payments/:id/settle
// ------------------------------------------------------------
// Atalho da tabela: "recebi essa parcela" sem abrir o formulario
// inteiro. PATCH e nao PUT porque mexe em parte do recurso.
router.patch("/:id/settle", validate(settleSchema), async (req, res, next) => {
  try {
    const { paid, paidAt, method } = req.body;

    const result = await prisma.payment.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: paid
        ? { paidAt: paidAt || startOfToday(), method: method || null }
        : { paidAt: null, method: null },
    });

    if (result.count === 0) {
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

// ------------------------------------------------------------
// DELETE /payments/:id
// ------------------------------------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    const result = await prisma.payment.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Pagamento nao encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
