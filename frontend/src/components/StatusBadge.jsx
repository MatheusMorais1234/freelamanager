// Badge de status. Texto usa -emphasis (o ambar puro nao passa em AA no tema claro).

import { Clock, Loader, CheckCircle2, XCircle, AlertCircle, CircleDollarSign } from "lucide-react";

import { STATUS_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

export const STATUS_STYLE = {
  PENDING: {
    icon: Clock,
    chart: "var(--chart-1)",
    badge: "border-primary/30 bg-primary/10 text-primary-emphasis",
  },
  ACTIVE: {
    icon: Loader,
    chart: "var(--chart-2)",
    badge: "border-info/30 bg-info/10 text-info",
  },
  COMPLETED: {
    icon: CheckCircle2,
    chart: "var(--chart-3)",
    badge: "border-success/30 bg-success/10 text-success-emphasis",
  },
  CANCELLED: {
    icon: XCircle,
    chart: "var(--chart-4)",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

export const PAYMENT_STATUS_STYLE = {
  PENDING: {
    icon: CircleDollarSign,
    chart: "var(--chart-1)",
    badge: "border-primary/30 bg-primary/10 text-primary-emphasis",
  },
  PAID: {
    icon: CheckCircle2,
    chart: "var(--chart-3)",
    badge: "border-success/30 bg-success/10 text-success-emphasis",
  },
  OVERDUE: {
    icon: AlertCircle,
    chart: "var(--chart-4)",
    badge: "border-destructive/30 bg-destructive/10 text-destructive",
  },
};

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
