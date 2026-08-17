import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { FileText, Loader2, MoreHorizontal, Plus, Search } from "lucide-react";

import { api } from "@/lib/api.js";
import StatusBadge from "@/components/StatusBadge.jsx";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/States.jsx";
import {
  daysUntil,
  formatDate,
  formatMoney,
  STATUS_LABEL,
  STATUS_LIST,
  toInputDate,
} from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
import { Card } from "@/components/ui/card.jsx";
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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
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
  clientId: "",
  title: "",
  description: "",
  amount: "",
  status: "PENDING",
  dueDate: "",
};

/** Aviso de prazo ao lado da data, so quando ainda importa. */
function DueHint({ dueDate, status }) {
  if (!dueDate || status === "COMPLETED" || status === "CANCELLED") return null;

  const days = daysUntil(dueDate);
  if (days > 7) return null;

  return (
    <span
      className={cn(
        "text-xs",
        days < 0 ? "font-medium text-destructive" : "text-primary"
      )}
    >
      {days < 0
        ? `${Math.abs(days)} dia(s) em atraso`
        : days === 0
          ? "vence hoje"
          : `em ${days} dia(s)`}
    </span>
  );
}

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
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
  // Guarda o id da linha cujo status esta sendo trocado, para
  // desabilitar so aquele menu e nao a tabela inteira.
  const [updatingId, setUpdatingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const [c, cl] = await Promise.all([api.get("/contracts"), api.get("/clients")]);
      setContracts(c.contracts);
      setClients(cl.clients);
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
    setForm({ ...EMPTY, clientId: clients[0]?.id || "" });
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
      await load();
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
      await load();
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
      await load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdatingId(null);
    }
  }

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return contracts.filter((c) => {
      if (filter !== "ALL" && c.status !== filter) return false;
      if (!term) return true;
      return `${c.title} ${c.client.name} ${c.client.company || ""}`
        .toLowerCase()
        .includes(term);
    });
  }, [contracts, filter, search]);

  const total = useMemo(
    () => filtered.reduce((sum, c) => sum + Number(c.amount), 0),
    [filtered]
  );

  // Contagem por aba, para os numeros aparecerem no filtro.
  const counts = useMemo(() => {
    const base = { ALL: contracts.length };
    for (const s of STATUS_LIST) {
      base[s] = contracts.filter((c) => c.status === s).length;
    }
    return base;
  }, [contracts]);

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

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList className="flex-wrap">
            <TabsTrigger value="ALL">Todos ({counts.ALL})</TabsTrigger>
            {STATUS_LIST.map((s) => (
              <TabsTrigger key={s} value={s}>
                {STATUS_LABEL[s]} ({counts[s]})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative max-w-sm lg:w-72">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por título ou cliente..."
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="max-w-xs">
                        <p className="truncate font-medium">{c.title}</p>
                        {c.description && (
                          <p className="truncate text-xs text-muted-foreground">
                            {c.description}
                          </p>
                        )}
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        <p className="truncate">{c.client.name}</p>
                        {c.client.company && (
                          <p className="truncate text-xs">{c.client.company}</p>
                        )}
                      </TableCell>

                      <TableCell className="tabular text-right font-medium">
                        {formatMoney(c.amount)}
                      </TableCell>

                      <TableCell>
                        <p className="tabular text-muted-foreground">
                          {formatDate(c.dueDate)}
                        </p>
                        <DueHint dueDate={c.dueDate} status={c.status} />
                      </TableCell>

                      <TableCell>
                        {/* Menu de status: troca rapida sem abrir o
                            formulario inteiro. */}
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={updatingId === c.id}
                            className="disabled:opacity-60"
                          >
                            {updatingId === c.id ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs">
                                <Loader2 className="size-3 animate-spin" />
                                Salvando
                              </span>
                            ) : (
                              <StatusBadge
                                status={c.status}
                                className="cursor-pointer hover:opacity-80"
                              />
                            )}
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuRadioGroup
                              value={c.status}
                              onValueChange={(s) => quickStatus(c, s)}
                            >
                              {STATUS_LIST.map((s) => (
                                <DropdownMenuRadioItem key={s} value={s}>
                                  {STATUS_LABEL[s]}
                                </DropdownMenuRadioItem>
                              ))}
                            </DropdownMenuRadioGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(c)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setToDelete(c)}
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

      {/* ---------------- Confirmacao de exclusao ---------------- */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
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
