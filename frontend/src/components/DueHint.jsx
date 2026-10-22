// Texto curto do lado do vencimento ("vence hoje", "3 dia(s) em atraso").\nQuando esconder fica a cargo da pagina (prop hide).

import { cn } from "@/lib/utils.js";
import { daysUntil, dueLabel } from "@/lib/format.js";

export function DueHint({ dueDate, hide = false, mute = false }) {
  if (!dueDate || hide) return null;

  const days = daysUntil(dueDate);
  if (days === null) return null;

  const late = days < 0;

  return (
    <span
      className={cn(
        "text-xs",
        late
          ? "font-medium text-destructive"
          : mute
            ? "text-muted-foreground"
            : "text-primary"
      )}
    >
      {dueLabel(days)}
    </span>
  );
}

export default DueHint;
