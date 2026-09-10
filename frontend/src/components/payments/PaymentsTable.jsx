// ============================================================
// Tabela de parcelas
// ------------------------------------------------------------
// So desenha: quem carrega, filtra e salva e a pagina. Aqui
// ficam as sete colunas e as duas acoes que moram na linha -
// a baixa rapida ("recebi por Pix") e o menu de ações.
// ============================================================

import { CheckCircle2, Loader2, MoreHorizontal, Undo2 } from "lucide-react";

import { DueHint } from "@/components/DueHint.jsx";
import { PaymentStatusBadge } from "@/components/StatusBadge.jsx";
import {
  daysUntil,
  formatDate,
  formatMoney,
  PAYMENT_METHOD_LABEL,
  PAYMENT_METHOD_LIST,
} from "@/lib/format.js";

import { Button } from "@/components/ui/button.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

/**
 * @param {Array}    payments
 * @param {string}   settlingId  id da linha sendo baixada agora
 * @param {Function} onSettle    (parcela, forma)
 * @param {Function} onUnsettle  (parcela)
 * @param {Function} onEdit      (parcela)
 * @param {Function} onDelete    (parcela)
 */
export function PaymentsTable({
  payments,
  settlingId,
  onSettle,
  onUnsettle,
  onEdit,
  onDelete,
}) {
  return (
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
        {payments.map((p) => (
          <TableRow key={p.id}>
            <TableCell className="max-w-[14rem]">
              <p className="truncate font-medium">{p.description || "Parcela"}</p>
              {p.notes && (
                <p className="truncate text-xs text-muted-foreground">{p.notes}</p>
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
              <p className="tabular text-muted-foreground">{formatDate(p.dueDate)}</p>
              {/* A regra de quando o aviso cabe e desta tela: parcela
                  ja recebida nao tem prazo, e prazo distante nao
                  precisa de alarde. */}
              <DueHint
                dueDate={p.dueDate}
                hide={p.status === "PAID" || daysUntil(p.dueDate) > 7}
              />
            </TableCell>

            {/* min-h-9: esta celula alterna entre duas linhas de texto
                e um botao pequeno. Sem altura reservada, a tabela
                ficava com linhas de alturas diferentes conforme a
                parcela ja tivesse sido recebida ou nao. */}
            <TableCell>
              <div className="flex min-h-9 flex-col justify-center">
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
                      <Button variant="outline" size="sm" className="gap-1.5 self-start">
                        <CheckCircle2 className="size-3.5" />
                        Receber
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      <DropdownMenuLabel>Recebido hoje por</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {PAYMENT_METHOD_LIST.map((m) => (
                        <DropdownMenuItem key={m} onClick={() => onSettle(p, m)}>
                          {PAYMENT_METHOD_LABEL[m]}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
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
                  <DropdownMenuItem onClick={() => onEdit(p)}>Editar</DropdownMenuItem>
                  {p.paidAt && (
                    <DropdownMenuItem onClick={() => onUnsettle(p)} className="gap-2">
                      <Undo2 className="size-4" />
                      Desfazer recebimento
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(p)}>
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default PaymentsTable;
