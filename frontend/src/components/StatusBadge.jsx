// Selo colorido do status de um contrato.
// A cor tambem aparece nos graficos do painel - as duas leem
// as mesmas variaveis de tema, entao nunca saem de sincronia.

import { Clock, Loader, CheckCircle2, XCircle, AlertCircle, CircleDollarSign } from "lucide-react";

import { STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

export const STATUS_STYLE = {
  PENDING: {
    icon: Clock,
    chart: "var(--chart-1)",
    badge: "border-primary/30 bg-primary/10 text-primary",
  },
  ACTIVE: {
    icon: Loader,
    chart: "var(--chart-2)",
    badge: "border-info/30 bg-info/10 text-info",
  },
  COMPLETED: {
    icon: CheckCircle2,
    chart: "var(--chart-3)",
    badge: "border-success/30 bg-success/10 text-success",
  },
  CANCELLED: {
    icon: XCircle,
    chart: "var(--chart-4)",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

// Cores do status de uma PARCELA. Sao tres, nao quatro: uma
// parcela ou foi recebida, ou vence adiante, ou venceu.
export const PAYMENT_STATUS_STYLE = {
  PENDING: {
    icon: CircleDollarSign,
    chart: "var(--chart-1)",
    badge: "border-primary/30 bg-primary/10 text-primary",
  },
  PAID: {
    icon: CheckCircle2,
    chart: "var(--chart-3)",
    badge: "border-success/30 bg-success/10 text-success",
  },
  OVERDUE: {
    icon: AlertCircle,
    chart: "var(--chart-4)",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

// A casca visual e a mesma para contrato e parcela; so muda a
// tabela de estilo e o rotulo. Duplicar este JSX faria os dois
// selos irem se distanciando a cada ajuste de design.
function Badge({ style, label, className }) {
  if (!style) return null;

  const Icon = style.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        style.badge,
        className
      )}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

export default function StatusBadge({ status, className }) {
  return (
    <Badge style={STATUS_STYLE[status]} label={STATUS_LABEL[status]} className={className} />
  );
}

export function PaymentStatusBadge({ status, className }) {
  return (
    <Badge
      style={PAYMENT_STATUS_STYLE[status]}
      label={PAYMENT_STATUS_LABEL[status]}
      className={className}
    />
  );
}
