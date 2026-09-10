// ============================================================
// Formulario de parcela (painel lateral)
// ------------------------------------------------------------
// Serve para criar e para editar. A diferenca entre os dois
// casos e o parcelamento: criar pode gerar varias parcelas de
// uma vez; editar mexe em uma parcela que ja existe e nao pode
// transforma-la em varias.
//
// O estado do formulario mora na pagina (form / setForm): quem
// salva e ela, e duplicar o estado aqui so criaria duas versoes
// da mesma verdade.
// ============================================================

import { Loader2 } from "lucide-react";

import { formatMoney, PAYMENT_METHOD_LABEL, PAYMENT_METHOD_LIST } from "@/lib/format.js";

import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
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

/**
 * @param {boolean}  open
 * @param {Function} onOpenChange
 * @param {object}   editing    a parcela em edicao, ou null ao criar
 * @param {object}   form
 * @param {Function} setForm
 * @param {Array}    contracts  opcoes do seletor de contrato
 * @param {boolean}  busy       salvando
 * @param {string}   error      erro devolvido pelo backend
 * @param {Function} onSubmit
 */
export function PaymentFormSheet({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  contracts,
  busy,
  error,
  onSubmit,
}) {
  const parcelado = Number(form.installments) > 1;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{editing ? "Editar pagamento" : "Novo pagamento"}</SheetTitle>
          <SheetDescription>
            {editing
              ? "Ajuste valor, vencimento ou recebimento desta parcela."
              : "Registre uma cobrança avulsa ou divida o valor em parcelas mensais."}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={onSubmit} className="space-y-5 px-4 pb-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
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
                {parcelado ? "Valor total (R$) *" : "Valor (R$) *"}
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
              <Label htmlFor="dueDate">{parcelado ? "1º vencimento *" : "Vencimento *"}</Label>
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
              {parcelado && Number(form.amount) > 0 && (
                <p className="text-xs text-muted-foreground">
                  {form.installments}x de aproximadamente{" "}
                  {formatMoney(Number(form.amount) / Number(form.installments))}, uma a
                  cada mês a partir do primeiro vencimento.
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
              {!editing && parcelado && form.paidAt && (
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
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
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
  );
}

export default PaymentFormSheet;
