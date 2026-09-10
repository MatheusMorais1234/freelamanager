// ============================================================
// Situacao de uma parcela
// ------------------------------------------------------------
// O status de um pagamento NAO existe no banco. A tabela guarda
// so a data de recebimento (paid_at); "a receber", "recebido" e
// "atrasado" nascem de comparar essa data, o vencimento e hoje.
//
// Por que derivar em vez de gravar uma coluna "status":
//   - uma parcela vencida ontem viraria "atrasada" sozinha na
//     virada do dia, sem nenhuma rotina agendada para atualizar;
//   - e impossivel gravar um estado impossivel, do tipo
//     "recebido" sem data de recebimento.
//
// Mora aqui, e nao dentro de uma rota, porque duas rotas usam:
// /payments e o detalhe de /contracts. Duplicar a regra faria as
// duas telas discordarem no dia em que uma delas mudasse.
// ============================================================

import { money } from "./money.js";

/** Hoje a meia-noite em UTC - as datas sao gravadas como @db.Date. */
export function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

/** "PAID" | "OVERDUE" | "PENDING" */
export function statusOf(payment, today = startOfToday()) {
  if (payment.paidAt) return "PAID";
  return payment.dueDate < today ? "OVERDUE" : "PENDING";
}

/**
 * A MESMA regra do statusOf, escrita como filtro de banco.
 *
 * Existe porque nem sempre da para calcular o status depois de
 * ler: para filtrar a lista ou somar totais, a condicao tem que
 * ir ate o Postgres. Um filter() em JavaScript depois da consulta
 * daria a contagem e a paginacao erradas quando a lista crescer.
 *
 * Fica ao lado do statusOf de proposito - sao a mesma regra em
 * duas linguagens, e separa-las e como as duas discordariam.
 *
 * Status desconhecido (ou ausente) devolve {}: nenhum filtro.
 */
export function paymentWhere(status, today = startOfToday()) {
  const porStatus = {
    PAID: { paidAt: { not: null } },
    PENDING: { paidAt: null, dueDate: { gte: today } },
    OVERDUE: { paidAt: null, dueDate: { lt: today } },
  };

  return porStatus[status] ?? {};
}

/**
 * Deixa uma parcela pronta para virar JSON: valor como string
 * (Decimal nao existe em JSON, e float perderia centavos) e o
 * status ja calculado.
 */
export function serializePayment(payment, today = startOfToday()) {
  return {
    ...payment,
    amount: money(payment.amount),
    status: statusOf(payment, today),
  };
}
