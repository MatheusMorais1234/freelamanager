// Selo colorido do status de um contrato.
// A cor tambem aparece nos graficos do painel - as duas leem
// as mesmas variaveis de tema, entao nunca saem de sincronia.

import { Clock, Loader, CheckCircle2, XCircle } from "lucide-react";

import { STATUS_LABEL } from "@/lib/format.js";
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

export default function StatusBadge({ status, className }) {
  const style = STATUS_STYLE[status];
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
      {STATUS_LABEL[status]}
    </span>
  );
}
