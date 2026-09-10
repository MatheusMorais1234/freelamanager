// ============================================================
// Detalhe de um cliente - a ficha completa e o que ele rende
// ------------------------------------------------------------
// A tabela de clientes mostra uma linha por cliente, com o
// essencial. Aqui aparece o resto do cadastro (endereco,
// documento, observacoes) e, principalmente, a resposta que a
// lista nao da: quanto este cliente ja pagou, quanto ainda deve
// e se tem alguma coisa atrasada.
//
// Tudo vem de GET /clients/:id, que ja traz os contratos e os
// totais somados no banco - uma chamada, nao uma por contrato.
// ============================================================

import { useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  FileText,
  Globe,
  Mail,
  MapPin,
  Phone,
  Smartphone,
  StickyNote,
  User,
} from "lucide-react";

import { api } from "@/lib/api.js";
import { useApiData } from "@/hooks/useApiData.js";
import StatusBadge from "@/components/StatusBadge.jsx";
import { DetailSkeleton, ErrorState } from "@/components/States.jsx";
import {
  formatDate,
  formatDocument,
  formatMoney,
  formatPhone,
  formatZip,
  CLIENT_TYPE_LABEL,
} from "@/lib/format.js";

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

/** Linha de contato: icone, valor e (quando faz sentido) link. */
function ContactLine({ icon: Icon, children, href }) {
  if (!children) return null;

  const conteudo = (
    <span className="flex min-w-0 items-center gap-2 text-sm">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" />
      <span className="truncate">{children}</span>
    </span>
  );

  // Sem href o dado ainda aparece - so nao vira link.
  return href ? (
    <a
      href={href}
      className="block hover:text-primary hover:underline"
      // Link externo em aba nova: tirar o usuario do sistema no
      // meio de uma consulta seria perder o contexto dele.
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {conteudo}
    </a>
  ) : (
    conteudo
  );
}

/**
 * Os tres numeros que resumem a relacao financeira com o
 * cliente. "Atrasado" so aparece quando existe - um zero em
 * vermelho na tela chama atencao para nada.
 */
function FinancialSummary({ summary }) {
  const recebido = Number(summary.paid);
  const aVencer = Number(summary.pending);
  const atrasado = Number(summary.overdue);

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          Recebido
        </p>
        <p className="tabular mt-1 text-xl font-semibold text-success">
          {formatMoney(recebido)}
        </p>
      </div>

      <div className="rounded-lg border p-3">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          A receber
        </p>
        <p className="tabular mt-1 text-xl font-semibold text-primary">
          {formatMoney(aVencer)}
        </p>
      </div>

      {atrasado > 0 && (
        <div className="col-span-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs font-medium tracking-wide text-destructive uppercase">
            Em atraso
          </p>
          <p className="tabular mt-1 text-xl font-semibold text-destructive">
            {formatMoney(atrasado)}
          </p>
        </div>
      )}
    </div>
  );
}

/** Endereco montado em uma linha so, pulando o que estiver vazio. */
function enderecoEmLinha(c) {
  const rua = [c.street, c.number].filter(Boolean).join(", ");
  const cidade = [c.city, c.state].filter(Boolean).join("/");
  const partes = [rua, c.complement, c.district, cidade].filter(Boolean);

  if (partes.length === 0 && !c.zipCode) return null;

  return [partes.join(" · "), c.zipCode ? `CEP ${formatZip(c.zipCode)}` : ""]
    .filter(Boolean)
    .join(" — ");
}

export default function ClientDetail({ clientId, onOpenChange, onEdit }) {
  // Sem cliente escolhido o painel esta fechado - devolver null
  // evita uma chamada a /clients/null.
  const buscar = useCallback(async () => {
    if (!clientId) return null;
    return api.get(`/clients/${clientId}`);
  }, [clientId]);

  // Trocar de cliente refaz a busca, e o hook descarta a
  // resposta do anterior se ela chegar atrasada - era assim que
  // o painel mostrava a ficha do cliente errado. Fechar zera o
  // conteudo pelo mesmo caminho: clientId vira null, a busca
  // devolve null e o painel volta ao esqueleto.
  const { data, loading, error, reload } = useApiData(buscar, [clientId]);

  const client = data?.client ?? null;
  const summary = data?.summary ?? null;

  const ehEmpresa = client?.type === "COMPANY";
  const endereco = client ? enderecoEmLinha(client) : null;

  return (
    <Sheet open={!!clientId} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2.5">
            {client && (
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                {ehEmpresa ? <Building2 className="size-4" /> : <User className="size-4" />}
              </span>
            )}
            <span className="min-w-0 truncate">{client?.name || "Cliente"}</span>
          </SheetTitle>
          <SheetDescription>
            {client
              ? [client.company, CLIENT_TYPE_LABEL[client.type]]
                  .filter(Boolean)
                  .join(" — ")
              : "Carregando..."}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4 pb-6">
          {error ? (
            <ErrorState message={error} onRetry={reload} />
          ) : loading || !client ? (
            <DetailSkeleton />
          ) : (
            <>
              {summary && <FinancialSummary summary={summary} />}

              {/* ---------------- Identificacao ---------------- */}
              <div className="grid grid-cols-2 gap-4">
                <Field label={ehEmpresa ? "CNPJ" : "CPF"}>
                  <span className="tabular">
                    {formatDocument(client.document, client.type) || "—"}
                  </span>
                </Field>

                {ehEmpresa ? (
                  <Field label="Inscrição estadual">
                    <span className="tabular">{client.stateRegistration || "—"}</span>
                  </Field>
                ) : (
                  <Field label="Nascimento">
                    <span className="tabular">
                      {client.birthDate ? formatDate(client.birthDate) : "—"}
                    </span>
                  </Field>
                )}
              </div>

              {/* ---------------- Contato ---------------- */}
              <Field label="Contato">
                <div className="space-y-1.5">
                  <ContactLine icon={Mail} href={client.email && `mailto:${client.email}`}>
                    {client.email}
                  </ContactLine>
                  <ContactLine icon={Smartphone} href={client.mobile && `tel:${client.mobile}`}>
                    {client.mobile && formatPhone(client.mobile)}
                  </ContactLine>
                  <ContactLine icon={Phone} href={client.phone && `tel:${client.phone}`}>
                    {client.phone && formatPhone(client.phone)}
                  </ContactLine>
                  <ContactLine icon={Globe} href={client.website}>
                    {client.website}
                  </ContactLine>

                  {!client.email && !client.mobile && !client.phone && !client.website && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum contato cadastrado.
                    </p>
                  )}
                </div>
              </Field>

              {endereco && (
                <Field label="Endereço">
                  <p className="flex gap-2 text-muted-foreground">
                    <MapPin className="mt-0.5 size-3.5 shrink-0" />
                    <span>{endereco}</span>
                  </p>
                </Field>
              )}

              {client.notes && (
                <Field label="Observações">
                  <p className="flex gap-2 whitespace-pre-line text-muted-foreground">
                    <StickyNote className="mt-0.5 size-3.5 shrink-0" />
                    <span>{client.notes}</span>
                  </p>
                </Field>
              )}

              <Field label="Cliente desde">
                <span className="tabular flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="size-3.5" />
                  {formatDate(client.createdAt)}
                </span>
              </Field>

              <Separator />

              {/* ---------------- Contratos ---------------- */}
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="size-4 text-primary" />
                    Contratos ({client.contracts.length})
                  </h3>

                  {client.contracts.length > 0 && (
                    <Button asChild variant="ghost" size="sm" className="gap-1.5">
                      <Link to={`/contracts?client=${client.id}`}>
                        Gerenciar
                        <ArrowRight className="size-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>

                {client.contracts.length === 0 ? (
                  <div className="rounded-lg border border-dashed px-4 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Nenhum contrato com este cliente ainda.
                    </p>
                    <Button asChild variant="outline" size="sm" className="mt-3">
                      <Link to={`/contracts?client=${client.id}`}>Criar contrato</Link>
                    </Button>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {client.contracts.map((c) => (
                      <li key={c.id} className="rounded-lg border px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <p className="min-w-0 flex-1 truncate text-sm font-medium">
                            {c.title}
                          </p>
                          <StatusBadge status={c.status} className="shrink-0" />
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="tabular font-medium text-foreground">
                            {formatMoney(c.amount)}
                          </span>
                          {/* O quanto ja entrou por contrato vem
                              somado do backend, num groupBy so. */}
                          <span className="tabular">
                            recebido {formatMoney(c.paid)}
                          </span>
                          {c.dueDate && (
                            <span className="tabular">prazo {formatDate(c.dueDate)}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Editar mora na tela de clientes; aqui so
                  chamamos aquele mesmo formulario. */}
              {onEdit && (
                <>
                  <Separator />
                  <Button variant="outline" className="w-full" onClick={() => onEdit(client)}>
                    Editar cadastro
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
