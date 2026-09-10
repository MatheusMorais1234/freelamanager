// ============================================================
// Resumo do topo da tela de pagamentos
// ------------------------------------------------------------
// Tres numeros que respondem a pergunta do freelancer antes de
// ele olhar a tabela: quanto ja entrou, quanto ainda vem e
// quanto passou do prazo.
//
// Os cartoes vem do StatCard compartilhado. A versao antiga
// desta tela tinha um SummaryCard proprio que tingia so o
// numero e deixava o icone sempre cinza - o cartao de "atrasado"
// nao se distinguia do de "recebido" numa olhada rapida.
// ============================================================

import { AlertCircle, CheckCircle2, Wallet } from "lucide-react";

import { StatCard } from "@/components/StatCard.jsx";
import { formatMoney } from "@/lib/format.js";

/** @param {object} summary  { paid, pending, overdue } com total e count */
export function PaymentsSummary({ summary }) {
  return (
    <section className="mb-4 grid gap-4 sm:grid-cols-3">
      <StatCard
        icon={CheckCircle2}
        label="Recebido"
        value={formatMoney(summary.paid.total)}
        hint={`${summary.paid.count} parcela(s)`}
        tone="success"
      />
      <StatCard
        icon={Wallet}
        label="A receber"
        value={formatMoney(summary.pending.total)}
        hint={`${summary.pending.count} em aberto`}
        tone="primary"
      />
      <StatCard
        icon={AlertCircle}
        label="Atrasado"
        value={formatMoney(summary.overdue.total)}
        hint={`${summary.overdue.count} vencida(s)`}
        tone="destructive"
      />
    </section>
  );
}

export default PaymentsSummary;
