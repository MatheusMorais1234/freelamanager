// ============================================================
// Tela de contratos - o trabalho combinado com cada cliente
// ------------------------------------------------------------
// A pagina decide O QUE mostrar (busca, filtro, recorte por
// cliente) e o que mandar para a API. O desenho da tabela mora
// em components/contracts/ContractsTable.jsx.
// ============================================================

import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FileText, Loader2, Plus, X } from "lucide-react";

import { api } from "@/lib/api.js";
import { LISTA_VAZIA, useApiData } from "@/hooks/useApiData.js";
import ContractDetail from "@/components/ContractDetail.jsx";
import ContractsTable from "@/components/contracts/ContractsTable.jsx";
import ConfirmDialog from "@/components/ConfirmDialog.jsx";
import FilterBar from "@/components/FilterBar.jsx";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/States.jsx";
import {
  countByStatus,
  formatMoney,
  STATUS_LABEL,
  STATUS_LIST,
  toInputDate,
} from "@/lib/format.js";

import { Button } from "@/components/ui/button.jsx";
import { Card } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
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

const EMPTY = {
  clientId: "",
  title: "",
  description: "",
  amount: "",
  status: "PENDING",
  dueDate: "",
};

export default function Contracts() {
  const buscar = useCallback(
    () =>
      Promise.all([api.get("/contracts"), api.get("/clients")]).then(([c, cl]) => ({
        contracts: c.contracts,
        clients: cl.clients,
      })),
    []
  );

  const { data, loading, error: loadError, reload } = useApiData(buscar);

  const contracts = data?.contracts ?? LISTA_VAZIA;
  const clients = data?.clients ?? LISTA_VAZIA;

  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  // ?client=<id> recorta a lista em um cliente so. Quem chega
  // pelo detalhe do cliente cai aqui ja filtrado.
  const [searchParams, setSearchParams] = useSearchParams();
  const clientFilter = searchParams.get("client");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const [toDelete, setToDelete] = useState(null);
  // Id do contrato aberto no painel de detalhe (null = fechado).
  const [detailId, setDetailId] = useState(null);
  // Guarda o id da linha cujo status esta sendo trocado, para
  // desabilitar so aquele menu e nao a tabela inteira.
  const [updatingId, setUpdatingId] = useState(null);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, clientId: clientFilter || clients[0]?.id || "" });
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(contract) {
    setEditing(contract);
    setForm({
      clientId: contract.clientId,
      title: contract.title,
      description: contract.description || "",
      amount: contract.amount,
      status: contract.status,
      dueDate: toInputDate(contract.dueDate),
    });
    setFormError("");
    setSheetOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);

    // dueDate vazio precisa virar null, nao string vazia -
    // o backend espera uma data ou a ausencia dela.
    const payload = { ...form, dueDate: form.dueDate || null };

    try {
      if (editing) await api.put(`/contracts/${editing.id}`, payload);
      else await api.post("/contracts", payload);

      setSheetOpen(false);
      toast.success(editing ? "Contrato atualizado" : "Contrato criado");
      await reload();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const contract = toDelete;
    setToDelete(null);

    try {
      await api.delete(`/contracts/${contract.id}`);
      toast.success(`"${contract.title}" foi excluído`);
      await reload();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Troca o status direto na tabela, sem abrir o formulario.
  async function quickStatus(contract, status) {
    if (status === contract.status) return;

    setUpdatingId(contract.id);

    try {
      await api.put(`/contracts/${contract.id}`, {
        clientId: contract.clientId,
        title: contract.title,
        description: contract.description || "",
        amount: contract.amount,
        status,
        dueDate: contract.dueDate,
      });
      toast.success(`Status alterado para "${STATUS_LABEL[status]}"`);
      await reload();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contracts.filter((c) => {
      // Recorte vindo da URL (?client=), usado pelo detalhe do
      // cliente. Fica na URL, e nao no estado, para o endereco
      // poder ser copiado e recarregado sem perder o filtro.
      if (clientFilter && c.clientId !== clientFilter) return false;
      if (filter !== "ALL" && c.status !== filter) return false;
      if (!term) return true;
      return `${c.title} ${c.client.name} ${c.client.company || ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [contracts, filter, search, clientFilter]);

  // Nome do cliente do recorte, para dizer na tela qual e.
  const filteredClientName = useMemo(
    () => clients.find((c) => c.id === clientFilter)?.name,
    [clients, clientFilter]
  );

  const total = useMemo(
    () => filtered.reduce((sum, c) => sum + Number(c.amount), 0),
    [filtered]
  );

  // Contagem por aba, para os numeros aparecerem no filtro. Ela
  // segue o recorte por cliente, senao a aba diria "Pendente
  // (12)" e a tabela mostraria 2.
  const counts = useMemo(
    () =>
      countByStatus(
        clientFilter ? contracts.filter((c) => c.clientId === clientFilter) : contracts,
        STATUS_LIST
      ),
    [contracts, clientFilter]
  );

  const noClients = !loading && clients.length === 0;

  return (
    <>
      <PageHeader
        title="Contratos"
        description={
          loading
            ? "Carregando..."
            : `${filtered.length} contrato(s) · ${formatMoney(total)}`
        }
      >
        <Button onClick={openCreate} disabled={noClients} className="gap-2">
          <Plus className="size-4" />
          Novo contrato
        </Button>
      </PageHeader>

      {noClients && (
        <Alert className="mb-4">
          <AlertDescription>
            Cadastre um cliente antes de criar um contrato — todo contrato
            precisa estar ligado a alguém.
          </AlertDescription>
        </Alert>
      )}

      {/* Recorte por cliente sempre visivel e com saida a um
          clique: filtro que o usuario nao ve e armadilha - ele
          conclui que os outros contratos sumiram. */}
      {clientFilter && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
          <span className="min-w-0 truncate">
            Mostrando apenas os contratos de{" "}
            <strong>{filteredClientName || "um cliente"}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto gap-1.5"
            onClick={() => setSearchParams({}, { replace: true })}
          >
            <X className="size-3.5" />
            Limpar
          </Button>
        </div>
      )}

      <FilterBar
        value={filter}
        onChange={setFilter}
        options={STATUS_LIST}
        labels={STATUS_LABEL}
        counts={counts}
        search={search}
        onSearch={setSearch}
        placeholder="Buscar por título ou cliente..."
      />

      {loadError ? (
        <ErrorState message={loadError} onRetry={reload} />
      ) : (
        <Card className="overflow-hidden py-0">
          {loading ? (
            <TableSkeleton cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={
                contracts.length === 0 ? "Nenhum contrato ainda" : "Nada neste filtro"
              }
              description={
                contracts.length === 0
                  ? "Registre um contrato para acompanhar valores e prazos."
                  : "Tente outro status ou limpe a busca."
              }
            >
              {contracts.length === 0 && !noClients && (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="size-4" />
                  Criar o primeiro
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <ContractsTable
                contracts={filtered}
                updatingId={updatingId}
                onOpenDetail={(c) => setDetailId(c.id)}
                onQuickStatus={quickStatus}
                onEdit={openEdit}
                onDelete={setToDelete}
              />
            </div>
          )}
        </Card>
      )}

      {/* ---------------- Formulario ---------------- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar contrato" : "Novo contrato"}</SheetTitle>
            <SheetDescription>
              Ligue o trabalho a um cliente e acompanhe valor e prazo.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="space-y-5 px-4 pb-6">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientId">Cliente *</Label>
              <Select
                value={form.clientId || undefined}
                onValueChange={(clientId) => setForm({ ...form, clientId })}
              >
                <SelectTrigger id="clientId" className="w-full">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex.: Site institucional"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Escopo, entregas combinadas, observações..."
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">Prazo</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(status) => setForm({ ...form, status })}
              >
                <SelectTrigger id="status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_LIST.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* ---------------- Detalhe do contrato ---------------- */}
      <ContractDetail
        contractId={detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Excluir "${toDelete?.title}"?`}
        description="Esta ação não pode ser desfeita."
        onConfirm={confirmDelete}
      />
    </>
  );
}
