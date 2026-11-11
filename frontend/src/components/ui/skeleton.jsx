import { cn } from "@/lib/utils"

// bg-muted sumia no cartao branco do tema claro; foreground/10 aparece nos dois temas
function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-foreground/10", className)}
      {...props} />
  );
}

export { Skeleton }
