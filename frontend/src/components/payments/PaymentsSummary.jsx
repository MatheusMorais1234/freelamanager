// Cards de recebido / a receber / atrasado

import { AlertCircle, CheckCircle2, Wallet } from "lucide-react";

import { StatCard } from "@/components/StatCard.jsx";
import { formatMoney } from "@/lib/format.js";

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
