// ============================================================
// Tela de pagamentos - as parcelas de cada contrato
// ------------------------------------------------------------
// Um contrato diz quanto foi COMBINADO. Esta tela diz quanto
// ja ENTROU, o que vence adiante e o que passou do prazo.
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Undo2,
  Wallet,
  X,
} from "lucide-react";

import { api } from "@/lib/api.js";
import { PaymentStatusBadge } from "@/components/StatusBadge.jsx";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/States.jsx";
import {
  daysUntil,
  formatDate,
  formatMoney,
  toInputDate,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_LIST,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_LIST,
} from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.jsx";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.jsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

const EMPTY = {
  contractId: "",
  description: "",
  amount: "",
  dueDate: "",
  installments: "1",
  paidAt: "",
  method: "",
  notes: "",
};

/** Cartao de resumo do topo: recebido, a receber, atrasado. */
function SummaryCard({ icon: Icon, label, value, hint, tone }) {
  const toneClass = {
    success: "text-success",
    primary: "text-primary",
    destructive: "text-destructive",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 py-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className={cn("tabular mt-2 truncate text-2xl font-semibold", toneClass)}>
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

/** Aviso ao lado do vencimento - so enquanto a parcela importa. */
function DueHint({ dueDate, status }) {
  if (status === "PAID") return null;

  const days = daysUntil(dueDate);
  if (days > 7) return null;

  return (
    <span
      className={cn("text-xs", days < 0 ? "font-medium text-destructive" : "text-primary")}
    >
      {days < 0
        ? `${Math.abs(days)} dia(s) em atraso`
        : days === 0
          ? "vence hoje"
          : `em ${days} dia(s)`}
    </span>
  );
}

export default function Payments() {
  // O detalhe de um contrato manda para ca com ?contract=<id>.
  // Guardar o recorte na URL (e nao so no estado) faz o link ser
  // compartilhavel e o botao "voltar" do navegador funcionar.
  const [searchParams, setSearchParams] = useSearchParams();
  const contractFilter = searchParams.get("contract");

  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  // Id da linha sendo baixada, para travar so aquele botao e
  // nao a tabela inteira.
  const [settlingId, setSettlingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      // As tres chamadas partem juntas: uma nao depende da outra,
      // entao esperar em fila so somaria latencia.
      const [p, c, s] = await Promise.all([
        api.get("/payments"),
        api.get("/contracts"),
        api.get("/payments/summary"),
      ]);
      setPayments(p.payments);
      setContracts(c.contracts);
      setSummary(s.summary);
    } catch (err) {
      setLoadError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm({
      ...EMPTY,
      // Vindo do detalhe de um contrato, ele ja vem escolhido.
      contractId: contractFilter || contracts[0]?.id || "",
      // Vencimento sugerido: hoje. Melhor do que campo vazio -
      // na maioria das vezes basta ajustar o dia.
      dueDate: toInputDate(new Date()),
    });
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(payment) {
    setEditing(payment);
    setForm({
      contractId: payment.contractId,
      description: payment.description || "",
      amount: payment.amount,
      dueDate: toInputDate(payment.dueDate),
      installments: "1",
      paidAt: toInputDate(payment.paidAt),
      method: payment.method || "",
      notes: payment.notes || "",
    });
    setFormError("");
    setSheetOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);

    // Campos vazios viram null: o backend espera a ausencia do
    // valor, nao uma string vazia.
    const payload = {
      contractId: form.contractId,
      description: form.description,
      amount: form.amount,
      dueDate: form.dueDate,
      paidAt: form.paidAt || null,
      method: form.paidAt ? form.method || null : null,
      notes: form.notes,
      installments: Number(form.installments) || 1,
    };

    try {
      if (editing) await api.put(`/payments/${editing.id}`, payload);
      else await api.post("/payments", payload);

      setSheetOpen(false);
      toast.success(
        editing
          ? "Pagamento atualizado"
          : payload.installments > 1
            ? `${payload.installments} parcelas criadas`
            : "Pagamento criado"
      );
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  /** Baixa rapida na tabela: "recebi por Pix", sem abrir o formulario. */
  async function settle(payment, method) {
    setSettlingId(payment.id);

    try {
      await api.patch(`/payments/${payment.id}/settle`, { paid: true, method });
      toast.success("Pagamento recebido");
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSettlingId(null);
    }
  }

  /** Desfaz a baixa - erro de clique acontece. */
  async function unsettle(payment) {
    setSettlingId(payment.id);

    try {
      await api.patch(`/payments/${payment.id}/settle`, { paid: false });
      toast.success("Recebimento desfeito");
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSettlingId(null);
    }
  }

  async function confirmDelete() {
    const payment = toDelete;
    setToDelete(null);

    try {
      await api.delete(`/payments/${payment.id}`);
      toast.success("Pagamento excluído");
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return payments.filter((p) => {
      if (contractFilter && p.contractId !== contractFilter) return false;
      if (filter !== "ALL" && p.status !== filter) return false;
      if (!term) return true;

      return `${p.description || ""} ${p.contract.title} ${p.contract.client.name} ${
        p.contract.client.company || ""
      }`
        .toLowerCase()
        .includes(term);
    });
  }, [payments, filter, search, contractFilter]);

  // Nome do contrato do recorte, para o aviso dizer de qual
  // trabalho sao estas parcelas.
  const filteredContract = useMemo(
    () => contracts.find((c) => c.id === contractFilter),
    [contracts, contractFilter]
  );

  const filteredTotal = useMemo(
    () => filtered.reduce((sum, p) => sum + Number(p.amount), 0),
    [filtered]
  );

  // As contagens das abas seguem o recorte por contrato, senao
  // a aba diria "Recebido (9)" e a tabela mostraria 2.
  const counts = useMemo(() => {
    const scoped = contractFilter
      ? payments.filter((p) => p.contractId === contractFilter)
      : payments;

    const base = { ALL: scoped.length };
    for (const s of PAYMENT_STATUS_LIST) {
      base[s] = scoped.filter((p) => p.status === s).length;
    }
    return base;
  }, [payments, contractFilter]);

  const noContracts = !loading && contracts.length === 0;

  return (
    <>
      <PageHeader
        title="Pagamentos"
        description={
          loading
            ? "Carregando..."
            : `${filtered.length} parcela(s) · ${formatMoney(filteredTotal)}`
        }
      >
        <Button onClick={openCreate} disabled={noContracts} className="gap-2">
          <Plus className="size-4" />
          Novo pagamento
        </Button>
      </PageHeader>

      {noContracts && (
        <Alert className="mb-4">
          <AlertDescription>
            Crie um contrato antes de registrar pagamentos — toda parcela
            pertence a um trabalho combinado.
          </AlertDescription>
        </Alert>
      )}

      {summary && (
        <section className="mb-4 grid gap-4 sm:grid-cols-3">
          <SummaryCard
            icon={CheckCircle2}
            label="Recebido"
            value={formatMoney(summary.paid.total)}
            hint={`${summary.paid.count} parcela(s)`}
            tone="success"
          />
          <SummaryCard
            icon={Wallet}
            label="A receber"
            value={formatMoney(summary.pending.total)}
            hint={`${summary.pending.count} em aberto`}
            tone="primary"
          />
          <SummaryCard
            icon={AlertCircle}
            label="Atrasado"
            value={formatMoney(summary.overdue.total)}
            hint={`${summary.overdue.count} vencida(s)`}
            tone="destructive"
          />
        </section>
      )}

      {/* Recorte vindo do detalhe de um contrato. Fica visivel e
          com saida a um clique - filtro escondido e a maneira
          mais rapida de fazer alguem achar que sumiram dados. */}
      {contractFilter && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5">
          <p className="min-w-0 truncate text-sm">
            Parcelas de{" "}
            <span className="font-medium">
              {filteredContract?.title || "um contrato"}
            </span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 gap-1.5"
            onClick={() => setSearchParams({})}
          >
            <X className="size-3.5" />
            Ver todas
          </Button>
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="ALL">Todos ({counts.ALL})</TabsTrigger>
            {PAYMENT_STATUS_LIST.map((s) => (
              <TabsTrigger key={s} value={s}>
                {PAYMENT_STATUS_LABEL[s]} ({counts[s]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm lg:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por contrato ou cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <Card className="overflow-hidden py-0">
          {loading ? (
            <TableSkeleton cols={6} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title={
                payments.length === 0 ? "Nenhum pagamento ainda" : "Nada neste filtro"
              }
              description={
                payments.length === 0
                  ? "Registre as parcelas de um contrato para acompanhar o que já entrou."
                  : "Tente outro status ou limpe a busca."
              }
            >
              {payments.length === 0 && !noContracts && (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="size-4" />
                  Registrar o primeiro
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Recebimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="max-w-[14rem]">
                        <p className="truncate font-medium">{p.description || "Parcela"}</p>
                        {p.notes && (
                          <p className="truncate text-xs text-muted-foreground">
                            {p.notes}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="max-w-[14rem] text-muted-foreground">
                        <p className="truncate">{p.contract.title}</p>
                        <p className="truncate text-xs">{p.contract.client.name}</p>
                      </TableCell>

                      <TableCell className="tabular text-right font-medium">
                        {formatMoney(p.amount)}
                      </TableCell>

                      <TableCell>
                        <p className="tabular text-muted-foreground">
                          {formatDate(p.dueDate)}
                        </p>
                        <DueHint dueDate={p.dueDate} status={p.status} />
                      </TableCell>

                      <TableCell>
                        {p.paidAt ? (
                          <>
                            <p className="tabular text-muted-foreground">
                              {formatDate(p.paidAt)}
                            </p>
                            {p.method && (
                              <p className="text-xs text-muted-foreground">
                                {PAYMENT_METHOD_LABEL[p.method]}
                              </p>
                            )}
                          </>
                        ) : settlingId === p.id ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="size-3 animate-spin" />
                            Salvando
                          </span>
                        ) : (
                          // Baixar a parcela e a acao mais frequente da
                          // tela, entao ela fica a um clique - e o menu
                          // ja pergunta a forma no mesmo gesto.
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-1.5">
                                <CheckCircle2 className="size-3.5" />
                                Receber
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuLabel>Recebido hoje por</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {PAYMENT_METHOD_LIST.map((m) => (
                                <DropdownMenuItem key={m} onClick={() => settle(p, m)}>
                                  {PAYMENT_METHOD_LABEL[m]}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>

                      <TableCell>
                        <PaymentStatusBadge status={p.status} />
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(p)}>
                              Editar
                            </DropdownMenuItem>
                            {p.paidAt && (
                              <DropdownMenuItem
                                onClick={() => unsettle(p)}
                                className="gap-2"
                              >
                                <Undo2 className="size-4" />
                                Desfazer recebimento
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setToDelete(p)}
                            >
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      )}

      {/* ---------------- Formulario ---------------- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar pagamento" : "Novo pagamento"}</SheetTitle>
            <SheetDescription>
              {editing
                ? "Ajuste valor, vencimento ou recebimento desta parcela."
                : "Registre uma cobrança avulsa ou divida o valor em parcelas mensais."}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-6">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="contractId">Contrato *</Label>
              <Select
                value={form.contractId || undefined}
                onValueChange={(contractId) => setForm({ ...form, contractId })}
              >
                <SelectTrigger id="contractId" className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {contracts.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title} — {c.client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex.: Entrada, Parcela"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">
                  {Number(form.installments) > 1 ? "Valor total (R$) *" : "Valor (R$) *"}
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  {Number(form.installments) > 1 ? "1º vencimento *" : "Vencimento *"}
                </Label>
                <Input
                  id="dueDate"
                  type="date"
                  required
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>

            {/* Parcelamento existe so na criacao: editar uma
                parcela nao pode transforma-la em varias. */}
            {!editing && (
              <div className="space-y-2">
                <Label htmlFor="installments">Parcelas</Label>
                <Input
                  id="installments"
                  type="number"
                  min="1"
                  max="60"
                  value={form.installments}
                  onChange={(e) => setForm({ ...form, installments: e.target.value })}
                />
                {Number(form.installments) > 1 && Number(form.amount) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {form.installments}x de aproximadamente{" "}
                    {formatMoney(Number(form.amount) / Number(form.installments))}, uma
                    a cada mês a partir do primeiro vencimento.
                  </p>
                )}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paidAt">Recebido em</Label>
                <Input
                  id="paidAt"
                  type="date"
                  value={form.paidAt}
                  onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                />
                {!editing && Number(form.installments) > 1 && form.paidAt && (
                  <p className="text-xs text-muted-foreground">
                    Vale só para a primeira parcela.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="method">Forma</Label>
                <Select
                  // Sem data de recebimento nao ha forma de
                  // pagamento: o campo fica travado ate a data existir.
                  disabled={!form.paidAt}
                  value={form.method || undefined}
                  onValueChange={(method) => setForm({ ...form, method })}
                >
                  <SelectTrigger id="method" className="w-full">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHOD_LIST.map((m) => (
                      <SelectItem key={m} value={m}>
                        {PAYMENT_METHOD_LABEL[m]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Nota fiscal, combinado de desconto, etc."
              />
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button type="button" variant="ghost" onClick={() => setSheetOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* ---------------- Confirmacao de exclusao ---------------- */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir "{toDelete?.description || "Parcela"}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {formatMoney(toDelete?.amount)} de {toDelete?.contract.title}. Esta ação
              não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
