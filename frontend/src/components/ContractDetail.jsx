// ============================================================
// Detalhe de um contrato - o trabalho e o dinheiro dele
// ------------------------------------------------------------
// A tabela de contratos mostra uma linha por trabalho. Quem quer
// saber "e ai, quanto falta receber disso?" precisa abrir aqui.
//
// Os dados vem de GET /contracts/:id, que ja traz cliente e
// parcelas junto - uma chamada, nao tres.
// ============================================================

import { useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Wallet } from "lucide-react";

import { api } from "@/lib/api.js";
import { useApiData } from "@/hooks/useApiData.js";
import StatusBadge, { PaymentStatusBadge } from "@/components/StatusBadge.jsx";
import { DetailSkeleton, ErrorState } from "@/components/States.jsx";
import {
  formatDate,
  formatMoney,
  paidPercent,
  PAYMENT_METHOD_LABEL,
} from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.jsx";

/** Um dado solto: rotulo em cima, valor embaixo. */
function Field({ label, children, className }) {
  return (
    <div className={className}>
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

/**
 * Quanto do contrato ja entrou: barra, valor e o que falta.
 * O "falta" pode ficar negativo se o freelancer registrar
 * parcelas acima do valor combinado (aditivo, hora extra), e
 * isso e legitimo - por isso mostramos o excedente em vez de
 * cortar em zero.
 */
function PaymentSummary({ paid, total }) {
  const paidValue = Number(paid ?? 0);
  const totalValue = Number(total ?? 0);
  const remaining = totalValue - paidValue;
  const percent = paidPercent(paidValue, totalValue);

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            Recebido
          </p>
          <p className="tabular mt-1 text-2xl font-semibold text-success">
            {formatMoney(paidValue)}
          </p>
        </div>
        <p className="tabular text-sm text-muted-foreground">
          de {formatMoney(totalValue)}
        </p>
      </div>

      <div
        className="mt-3 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Percentual recebido do contrato"
      >
        <div
          className={cn(
            "h-full rounded-full transition-all",
            remaining <= 0 ? "bg-success" : "bg-primary"
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <p className="mt-2 text-xs text-muted-foreground">
        {remaining > 0 ? (
          <>
            Faltam <span className="tabular font-medium">{formatMoney(remaining)}</span>
          </>
        ) : remaining < 0 ? (
          <>
            Recebido{" "}
            <span className="tabular font-medium">{formatMoney(-remaining)}</span> acima
            do valor combinado
          </>
        ) : (
          "Contrato quitado"
        )}
      </p>
    </div>
  );
}

export default function ContractDetail({ contractId, onOpenChange }) {
  // Sem contrato escolhido o painel esta fechado - devolver
  // null evita uma chamada a /contracts/null.
  const buscar = useCallback(async () => {
    if (!contractId) return null;
    const { contract: data } = await api.get(`/contracts/${contractId}`);
    return data;
  }, [contractId]);

  // Trocar de contrato refaz a busca, e o hook descarta a
  // resposta do anterior se ela chegar atrasada - era assim que
  // o painel mostrava os dados do contrato errado. Fechar zera
  // o conteudo pelo mesmo caminho: contractId vira null, a
  // busca devolve null e o painel volta ao esqueleto.
  const { data: contract, loading, error, reload } = useApiData(buscar, [contractId]);

  return (
    <Sheet open={!!contractId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{contract?.title || "Contrato"}</SheetTitle>
          <SheetDescription>
            {contract
              ? `${contract.client.name}${
                  contract.client.company ? ` — ${contract.client.company}` : ""
                }`
              : "Carregando..."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading || !contract ? (
            <DetailSkeleton />
          ) : (
            <>
              <PaymentSummary paid={contract.paidAmount} total={contract.amount} />

              <div className="grid grid-cols-2 gap-4">
                <Field label="Valor">
                  <span className="tabular font-medium">
                    {formatMoney(contract.amount)}
                  </span>
                </Field>
                <Field label="Status">
                  <StatusBadge status={contract.status} />
                </Field>
                <Field label="Prazo">
                  <span className="tabular">{formatDate(contract.dueDate)}</span>
                </Field>
                <Field label="Criado em">
                  <span className="tabular">{formatDate(contract.createdAt)}</span>
                </Field>
              </div>

              {contract.description && (
                <Field label="Descrição">
                  <p className="whitespace-pre-line text-muted-foreground">
                    {contract.description}
                  </p>
                </Field>
              )}

              <Separator />

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <Wallet className="size-4 text-primary" />
                    Parcelas ({contract.payments.length})
                  </h3>

                  {/* Leva para a tela de pagamentos ja filtrada
                      neste contrato - editar e dar baixa moram la,
                      e nao vale duplicar aquilo aqui dentro. */}
                  <Button asChild variant="ghost" size="sm" className="gap-1.5">
                    <Link to={`/payments?contract=${contract.id}`}>
                      Gerenciar
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>

                {contract.payments.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhuma parcela registrada.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to={`/payments?contract=${contract.id}`}>
                        Registrar pagamento
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {contract.payments.map((p) => (
                      <li
                        key={p.id}
                        className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {p.description || "Parcela"}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {p.paidAt
                              ? `Recebido em ${formatDate(p.paidAt)}${
                                  p.method ? ` · ${PAYMENT_METHOD_LABEL[p.method]}` : ""
                                }`
                              : `Vence em ${formatDate(p.dueDate)}`}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="tabular text-sm font-medium">
                            {formatMoney(p.amount)}
                          </span>
                          <PaymentStatusBadge status={p.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
