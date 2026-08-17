// ============================================================
// Estados que nao sao "deu tudo certo"
// ------------------------------------------------------------
// Carregando, vazio e erro sao parte da interface, nao um
// detalhe. Centralizar aqui garante que as tres telas tratem
// esses momentos do mesmo jeito.
// ============================================================

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { cn } from "@/lib/utils.js";

/** Cabecalho padrao das paginas: titulo, apoio e acao a direita. */
export function PageHeader({ title, description, children }) {
  return (
    <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="flex shrink-0 gap-2">{children}</div>}
    </header>
  );
}

/**
 * Falha ao carregar. Sempre com um botao de tentar de novo:
 * a maioria dos erros de rede passa na segunda tentativa, e
 * obrigar o usuario a recarregar a pagina inteira e rude.
 */
export function ErrorState({ message, onRetry }) {
  return (
    <Card className="border-destructive/40">
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="grid size-11 place-items-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-5" />
        </span>
        <div>
          <p className="font-medium">Não foi possível carregar</p>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {message || "Verifique sua conexão e tente novamente."}
          </p>
        </div>
        {onRetry && (
          <Button variant="outline" onClick={onRetry} className="gap-2">
            <RefreshCw className="size-4" />
            Tentar de novo
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/** Lista sem nenhum item ainda (ou nenhum resultado de busca). */
export function EmptyState({ icon: Icon = Inbox, title, description, children }) {
  return (
    <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div>
        <p className="font-medium">{title}</p>
        {description && (
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

/**
 * Esqueleto da tabela enquanto os dados chegam. Mostrar a forma
 * do conteudo faz a espera parecer mais curta do que uma
 * palavra "Carregando..." sozinha no meio da tela.
 */
export function TableSkeleton({ rows = 5, cols = 5 }) {
  return (
    <div className="divide-y">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton
              key={c}
              className={cn("h-4", c === 0 ? "w-2/5" : "flex-1")}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardsSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardContent className="space-y-3 py-6">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
