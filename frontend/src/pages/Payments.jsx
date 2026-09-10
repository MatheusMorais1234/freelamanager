// ============================================================
// Tela de pagamentos - as parcelas de cada contrato
// ------------------------------------------------------------
// Um contrato diz quanto foi COMBINADO. Esta tela diz quanto
// ja ENTROU, o que vence adiante e o que passou do prazo.
//
// A pagina cuida SO das decisoes: o que buscar, o que filtrar e
// o que mandar para a API. O desenho da tabela, do formulario e
// dos cartoes de resumo mora em components/payments/ - assim
// esta tela cabe na cabeca de uma vez so.
// ============================================================

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Wallet, X } from "lucide-react";

import { api } from "@/lib/api.js";
import { LISTA_VAZIA, useApiData } from "@/hooks/useApiData.js";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/States.jsx";
import ConfirmDialog from "@/components/ConfirmDialog.jsx";
import FilterBar from "@/components/FilterBar.jsx";
import PaymentsSummary from "@/components/payments/PaymentsSummary.jsx";
import PaymentsTable from "@/components/payments/PaymentsTable.jsx";
import PaymentFormSheet from "@/components/payments/PaymentFormSheet.jsx";
import {
  countByStatus,
  formatMoney,
  toInputDate,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_LIST,
} from "@/lib/format.js";

import { Button } from "@/components/ui/button.jsx";
import { Card } from "@/components/ui/card.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";

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

export default function Payments() {
  // O detalhe de um contrato manda para ca com ?contract=<id>.
  // Guardar o recorte na URL (e nao so no estado) faz o link ser
  // compartilhavel e o botao "voltar" do navegador funcionar.
  const [searchParams, setSearchParams] = useSearchParams();
  const contractFilter = searchParams.get("contract");

  // As tres chamadas partem juntas: uma nao depende da outra,
  // entao esperar em fila so somaria latencia.
  const buscar = useCallback(
    () =>
      Promise.all([
        api.get("/payments"),
        api.get("/contracts"),
        api.get("/payments/summary"),
      ]).then(([p, c, s]) => ({
        payments: p.payments,
        contracts: c.contracts,
        summary: s.summary,
      })),
    []
  );

  const { data, loading, error: loadError, reload } = useApiData(buscar);

  const payments = data?.payments ?? LISTA_VAZIA;
  const contracts = data?.contracts ?? LISTA_VAZIA;
  const summary = data?.summary ?? null;

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
      await reload();
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
      await reload();
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
      await reload();
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
      await reload();
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
  const counts = useMemo(
    () =>
      countByStatus(
        contractFilter
          ? payments.filter((p) => p.contractId === contractFilter)
          : payments,
        PAYMENT_STATUS_LIST
      ),
    [payments, contractFilter]
  );

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

      {summary && <PaymentsSummary summary={summary} />}

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

      <FilterBar
        value={filter}
        onChange={setFilter}
        options={PAYMENT_STATUS_LIST}
        labels={PAYMENT_STATUS_LABEL}
        counts={counts}
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por contrato ou cliente..."
      />

      {loadError ? (
        <ErrorState message={loadError} onRetry={reload} />
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
              <PaymentsTable
                payments={filtered}
                settlingId={settlingId}
                onSettle={settle}
                onUnsettle={unsettle}
                onEdit={openEdit}
                onDelete={setToDelete}
              />
            </div>
          )}
        </Card>
      )}

      <PaymentFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editing={editing}
        form={form}
        setForm={setForm}
        contracts={contracts}
        busy={busy}
        error={formError}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir "${toDelete?.description || "Parcela"}"?`}
        description={
          <>
            {formatMoney(toDelete?.amount)} de {toDelete?.contract.title}. Esta ação
            não pode ser desfeita.
          </>
        }
        onConfirm={confirmDelete}
      />
    </>
  );
}
