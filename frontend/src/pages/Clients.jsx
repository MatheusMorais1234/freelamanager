import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Building2,
  Mail,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  User,
  Users,
} from "lucide-react";

import { api } from "@/lib/api.js";
import ClientForm, { EMPTY_CLIENT } from "@/components/ClientForm.jsx";
import ClientDetail from "@/components/ClientDetail.jsx";
import { EmptyState, ErrorState, PageHeader, TableSkeleton } from "@/components/States.jsx";
import {
  formatDocument,
  formatPhone,
  formatZip,
  onlyDigits,
  toInputDate,
} from "@/lib/format.js";

import { Badge } from "@/components/ui/badge.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Card } from "@/components/ui/card.jsx";
import { Input } from "@/components/ui/input.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
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

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = criando
  const [form, setForm] = useState(EMPTY_CLIENT);
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  const [toDelete, setToDelete] = useState(null);

  // Qual cliente esta aberto no painel de detalhe (null = nenhum).
  const [detailId, setDetailId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const data = await api.get("/clients");
      setClients(data.clients);
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
    setForm(EMPTY_CLIENT);
    setFormError("");
    setSheetOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    // O banco guarda null e so digitos; o formulario precisa de
    // string e da mascara aplicada.
    setForm({
      type: client.type || "PERSON",
      name: client.name || "",
      company: client.company || "",
      document: client.document
        ? formatDocument(client.document, client.type)
        : "",
      stateRegistration: client.stateRegistration || "",
      birthDate: toInputDate(client.birthDate),
      email: client.email || "",
      phone: client.phone ? formatPhone(client.phone) : "",
      mobile: client.mobile ? formatPhone(client.mobile) : "",
      website: client.website || "",
      zipCode: client.zipCode ? formatZip(client.zipCode) : "",
      street: client.street || "",
      number: client.number || "",
      complement: client.complement || "",
      district: client.district || "",
      city: client.city || "",
      state: client.state || "",
      notes: client.notes || "",
    });
    setFormError("");
    setSheetOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    setBusy(true);

    // Tira as mascaras antes de enviar: o backend grava so digitos.
    const payload = {
      ...form,
      document: onlyDigits(form.document),
      phone: onlyDigits(form.phone),
      mobile: onlyDigits(form.mobile),
      zipCode: onlyDigits(form.zipCode),
      birthDate: form.birthDate || null,
    };

    try {
      if (editing) await api.put(`/clients/${editing.id}`, payload);
      else await api.post("/clients", payload);

      setSheetOpen(false);
      toast.success(editing ? "Cliente atualizado" : "Cliente cadastrado");
      await load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const client = toDelete;
    setToDelete(null);

    try {
      await api.delete(`/clients/${client.id}`);
      toast.success(`"${client.name}" foi excluído`);
      await load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // Filtro roda no navegador: a lista e pequena, nao vale
  // uma ida ao servidor a cada tecla digitada. A busca tambem
  // olha o documento sem mascara, para "12345678900" achar
  // quem foi cadastrado como "123.456.789-00".
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return clients;

    const digits = onlyDigits(term);

    return clients.filter((c) => {
      const haystack = [c.name, c.company, c.email, c.city]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        haystack.includes(term) ||
        (digits && c.document?.includes(digits)) ||
        (digits && c.mobile?.includes(digits)) ||
        (digits && c.phone?.includes(digits))
      );
    });
  }, [clients, search]);

  return (
    <>
      <PageHeader
        title="Clientes"
        description={
          loading
            ? "Carregando..."
            : `${clients.length} cadastrado(s)${
                search ? ` · ${filtered.length} no filtro` : ""
              }`
        }
      >
        <Button onClick={openCreate} className="gap-2">
          <Plus className="size-4" />
          Novo cliente
        </Button>
      </PageHeader>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar por nome, empresa, CPF/CNPJ..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loadError ? (
        <ErrorState message={loadError} onRetry={load} />
      ) : (
        <Card className="overflow-hidden py-0">
          {loading ? (
            <TableSkeleton cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={Users}
              title={clients.length === 0 ? "Nenhum cliente ainda" : "Nada encontrado"}
              description={
                clients.length === 0
                  ? "Cadastre seu primeiro cliente para começar a registrar contratos."
                  : "Tente outro termo de busca."
              }
            >
              {clients.length === 0 && (
                <Button onClick={openCreate} className="gap-2">
                  <Plus className="size-4" />
                  Cadastrar o primeiro
                </Button>
              )}
            </EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead className="text-center">Contratos</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        {/* O nome e um botao, nao a linha inteira:
                            clique em qualquer lugar da linha
                            atrapalharia selecionar o texto do
                            e-mail ou do documento. */}
                        <button
                          type="button"
                          onClick={() => setDetailId(c.id)}
                          className="flex w-full items-center gap-3 text-left"
                        >
                          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
                            {c.type === "COMPANY" ? (
                              <Building2 className="size-4" />
                            ) : (
                              <User className="size-4" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-medium hover:text-primary hover:underline">
                              {c.name}
                            </p>
                            {c.company && (
                              <p className="truncate text-xs text-muted-foreground">
                                {c.company}
                              </p>
                            )}
                          </div>
                        </button>
                      </TableCell>

                      <TableCell className="tabular text-muted-foreground">
                        {formatDocument(c.document, c.type)}
                      </TableCell>

                      <TableCell>
                        <div className="space-y-0.5 text-sm text-muted-foreground">
                          {c.email && (
                            <p className="flex items-center gap-1.5 truncate">
                              <Mail className="size-3 shrink-0" />
                              {c.email}
                            </p>
                          )}
                          {(c.mobile || c.phone) && (
                            <p className="tabular flex items-center gap-1.5">
                              <Phone className="size-3 shrink-0" />
                              {formatPhone(c.mobile || c.phone)}
                            </p>
                          )}
                          {!c.email && !c.mobile && !c.phone && "—"}
                        </div>
                      </TableCell>

                      <TableCell className="text-muted-foreground">
                        {c.city ? `${c.city}${c.state ? `/${c.state}` : ""}` : "—"}
                      </TableCell>

                      <TableCell className="text-center">
                        <Badge variant="secondary" className="tabular">
                          {c._count.contracts}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Ações">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setDetailId(c.id)}>
                              Ver detalhes
                            </DropdownMenuItem>
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

      {/* ---------------- Detalhe ---------------- */}
      <ClientDetail
        clientId={detailId}
        onOpenChange={(open) => !open && setDetailId(null)}
        // "Editar cadastro" fecha o detalhe e abre o MESMO
        // formulario da tela, em vez de manter dois formularios
        // de cliente para dar manutencao.
        onEdit={(client) => {
          setDetailId(null);
          openEdit(client);
        }}
      />

      {/* ---------------- Formulario ---------------- */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{editing ? "Editar cliente" : "Novo cliente"}</SheetTitle>
            <SheetDescription>
              Apenas o nome é obrigatório. O resto você completa quando tiver.
            </SheetDescription>
          </SheetHeader>

          <div className="px-4 pb-6">
            <ClientForm
              form={form}
              setForm={setForm}
              onSubmit={handleSubmit}
              onCancel={() => setSheetOpen(false)}
              busy={busy}
              error={formError}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* ---------------- Confirmacao de exclusao ---------------- */}
      {/* AlertDialog (e nao Dialog) porque a acao e destrutiva:
          ele prende o foco e exige uma escolha explicita. */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{toDelete?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete?._count.contracts > 0 ? (
                <>
                  Os <strong>{toDelete._count.contracts} contrato(s)</strong> deste
                  cliente também serão apagados. Esta ação não pode ser desfeita.
                </>
              ) : (
                "Esta ação não pode ser desfeita."
              )}
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
