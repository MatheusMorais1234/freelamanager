// Card de indicador. Texto usa os tokens *-emphasis por contraste.

import { Card, CardContent } from "@/components/ui/card.jsx";
import { FieldLabel } from "@/components/States.jsx";
import { cn } from "@/lib/utils.js";

const TONES = {
  default: {
    value: "text-foreground",
    icon: "bg-muted text-muted-foreground",
    rail: "bg-border",
  },
  primary: {
    value: "text-primary-emphasis",
    icon: "bg-primary/10 text-primary-emphasis",
    rail: "bg-primary",
  },
  success: {
    value: "text-success-emphasis",
    icon: "bg-success/10 text-success-emphasis",
    rail: "bg-success",
  },
  destructive: {
    value: "text-destructive",
    icon: "bg-destructive/10 text-destructive",
    rail: "bg-destructive",
  },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  rail = false,
}) {
  const t = TONES[tone] ?? TONES.default;

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      {rail && (
        <span
          className={cn("absolute inset-x-0 top-0 h-0.5", t.rail)}
          aria-hidden="true"
        />
      )}

      <CardContent className="flex items-start justify-between gap-3 py-5">
        <div className="min-w-0">
          <FieldLabel>{label}</FieldLabel>
          <p className={cn("tabular mt-2 truncate text-2xl font-semibold", t.value)}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={cn("grid size-9 shrink-0 place-items-center rounded-lg", t.icon)}
          >
            <Icon className="size-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
