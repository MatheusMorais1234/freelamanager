// Barra de progresso 0-100 com role="progressbar"

import { cn } from "@/lib/utils.js";

export function ProgressBar({
  value = 0,
  className,
  barClassName = "bg-primary",
  label = "Progresso",
}) {
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default ProgressBar;
