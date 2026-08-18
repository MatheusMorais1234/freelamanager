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
 * Deixa uma parcela pronta para virar JSON: valor como string
 * (Decimal nao existe em JSON, e float perderia centavos) e o
 * status ja calculado.
 */
export function serializePayment(payment, today = startOfToday()) {
  return {
    ...payment,
    amount: payment.amount.toString(),
    status: statusOf(payment, today),
  };
}
