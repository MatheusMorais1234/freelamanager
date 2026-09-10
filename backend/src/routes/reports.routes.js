// ============================================================
// Relatorios - protegidas
//   GET /reports?from=&to=   fechamento de um periodo
// ------------------------------------------------------------
// O painel responde "como esta o negocio HOJE". Este relatorio
// responde outra pergunta: "o que aconteceu ENTRE duas datas" -
// que e o que se leva para o contador no fim do mes, ou para
// decidir quais clientes valem a pena.
//
// Duas janelas de tempo convivem aqui, e confundi-las daria
// numeros errados:
//   - o RECEBIDO e filtrado pela data do pagamento (paidAt):
//     dinheiro que entrou no caixa dentro do periodo;
//   - o A RECEBER e o ATRASADO sao filtrados pelo vencimento
//     (dueDate): compromissos daquele periodo.
// Uma parcela que venceu em janeiro e foi paga em marco conta
// como recebida em marco. E assim que o caixa funciona.
// ============================================================

import { Router } from "express";

import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { startOfToday } from "../lib/payment-status.js";
import { PAYMENT_METHODS } from "../lib/enums.js";
import { box } from "../lib/money.js";

const router = Router();
router.use(authenticate);

/**
 * Le uma data do formato "AAAA-MM-DD" que vem na URL.
 * Devolve null quando o texto nao e uma data valida - assim uma
 * query malformada vira "periodo padrao" em vez de erro 500.
 */
function parseDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Periodo pedido, ou o mes corrente quando nada e informado.
 *
 * O fim do dia e 23:59:59.999 porque `dueDate` e `paidAt` sao
 * colunas de data (sem hora): usar a meia-noite do dia final
 * como limite superior deixaria o proprio dia de fora.
 */
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

  // Datas invertidas ("de dezembro ate janeiro") devolveriam
  // tudo zerado sem explicacao. Trocar e o que o usuario quis.
  if (from > fim) return { from: fim, to: from, invertido: true };

  return { from, to: fim, invertido: false };
}

// ------------------------------------------------------------
// GET /reports
// ------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const { from, to, invertido } = resolvePeriod(req.query);
    const hoje = startOfToday();
    const base = { userId: req.userId };

    // Recebido no periodo: quem tem paidAt dentro da janela.
    const recebidoNoPeriodo = { ...base, paidAt: { gte: from, lte: to } };
    // Em aberto com vencimento no periodo.
    const emAberto = { ...base, paidAt: null, dueDate: { gte: from, lte: to } };

    // Onde o periodo e "hoje" se cruzam. Sem esses dois limites,
    // um relatorio inteiramente no futuro (ou inteiramente no
    // passado) escaparia de uma das pontas da janela.
    const inicioAVencer = from > hoje ? from : hoje;
    const fimAtrasado = to < hoje ? to : hoje;

    const [recebido, aVencer, atrasado, porMetodo, parcelasRecebidas, parcelasAbertas] =
      await Promise.all([
        prisma.payment.aggregate({
          where: recebidoNoPeriodo,
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // A receber: em aberto, dentro do periodo e ainda NAO
        // vencido. O corte por "hoje" e o que separa dos
        // atrasados - sem ele, a mesma parcela entraria nos dois
        // totais e a soma nao fecharia.
        prisma.payment.aggregate({
          where: { ...base, paidAt: null, dueDate: { gte: inicioAVencer, lte: to } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // Atrasado: em aberto, dentro do periodo e ja vencido.
        prisma.payment.aggregate({
          where: { ...base, paidAt: null, dueDate: { gte: from, lt: fimAtrasado } },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        // Por forma de recebimento - so faz sentido no que ja
        // entrou, porque parcela em aberto ainda nao tem forma.
        prisma.payment.groupBy({
          by: ["method"],
          where: recebidoNoPeriodo,
          _sum: { amount: true },
          _count: { _all: true },
        }),

        // As linhas do periodo, para agrupar por cliente e por
        // mes. O Prisma nao agrupa por relacao nem por "mes de
        // uma data", e a janela e curta - entao agrupamos aqui,
        // em vez de escrever SQL cru e perder a legibilidade.
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

    // ---------- Agrupamento por cliente ----------
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
      // A mesma parcela nao pode entrar duas vezes: ou ja venceu
      // (atrasado), ou ainda vai vencer (a receber).
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
      // Quem mais pagou primeiro: e a ordem que responde "de
      // onde vem meu faturamento".
      .sort((a, b) => Number(b.received) - Number(a.received));

    // ---------- Recebido mes a mes dentro do periodo ----------
    const meses = new Map();

    for (const p of parcelasRecebidas) {
      const chave = p.paidAt.toISOString().slice(0, 7); // "2026-08"
      meses.set(chave, (meses.get(chave) ?? 0) + Number(p.amount));
    }

    const monthly = [...meses.entries()]
      .map(([key, total]) => ({ key, total: total.toFixed(2) }))
      .sort((a, b) => a.key.localeCompare(b.key));

    // ---------- Formas de recebimento ----------
    // Parcela recebida sem forma anotada vira "OTHER", para a
    // soma das formas bater com o total recebido.
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
          // Avisa a tela que as datas vieram trocadas, para ela
          // poder corrigir os campos em vez de mentir em silencio.
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
