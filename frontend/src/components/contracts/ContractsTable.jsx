// Tabela de contratos. So renderiza, a logica fica em pages/Contracts.jsx.

import { Loader2, MoreHorizontal } from "lucide-react";

import StatusBadge from "@/components/StatusBadge.jsx";
import DueHint from "@/components/DueHint.jsx";
import ProgressBar from "@/components/ProgressBar.jsx";
import {
  daysUntil,
  formatDate,
  formatMoney,
  paidPercent,
  STATUS_LABEL,
  STATUS_LIST,
} from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

function PaidProgress({ paid, total }) {
  const value = Number(paid ?? 0);
  if (value <= 0) return null;

  const percent = paidPercent(value, total);
  const done = percent >= 100;

  return (
    <div className="mt-1 flex items-center justify-end gap-2">
      <span aria-hidden="true">
        <ProgressBar
          value={percent}
          className="w-16"
          barClassName={done ? "bg-success" : "bg-primary"}
          label="Recebido do contrato"
        />
      </span>
      <span
        className={cn(
          "tabular text-xs",
          done ? "text-success-emphasis" : "text-muted-foreground"
        )}
      >
        {done ? "quitado" : `${formatMoney(value)} recebido`}
      </span>
    </div>
  );
}

export function ContractsTable({
  contracts = [],
  updatingId,
  onOpenDetail,
  onQuickStatus,
  onEdit,
  onDelete,
}) {
  return (
    // ui/table ja tem overflow-x
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
        {contracts.map((c) => (
          <TableRow key={c.id}>
            <TableCell className="max-w-xs">
              <button
                type="button"
                onClick={() => onOpenDetail?.(c)}
                className="block w-full truncate rounded-md text-left font-medium hover:text-primary hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {c.title}
              </button>
              {c.description && (
                <p className="truncate text-xs text-muted-foreground">{c.description}</p>
              )}
            </TableCell>

            <TableCell className="text-muted-foreground">
              <p className="truncate">{c.client.name}</p>
              {c.client.company && <p className="truncate text-xs">{c.client.company}</p>}
            </TableCell>

            <TableCell className="text-right">
              <p className="tabular font-medium">{formatMoney(c.amount)}</p>
              <PaidProgress paid={c.paidAmount} total={c.amount} />
            </TableCell>

            <TableCell>
              <p className="tabular text-muted-foreground">{formatDate(c.dueDate)}</p>
              <DueHint
                dueDate={c.dueDate}
                hide={
                  c.status === "COMPLETED" ||
                  c.status === "CANCELLED" ||
                  daysUntil(c.dueDate) > 7
                }
              />
            </TableCell>

            <TableCell>
              {/* troca rapida de status */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={updatingId === c.id}
                    aria-label={`Alterar status de "${c.title}"`}
                    className="px-1 disabled:opacity-60"
                  >
                    {updatingId === c.id ? (
                      // TODO: StatusBadge com estado "salvando"
                      <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs">
                        <Loader2 className="size-3 animate-spin" />
                        Salvando
                      </span>
                    ) : (
                      <StatusBadge status={c.status} className="cursor-pointer" />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Alterar status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuRadioGroup
                    value={c.status}
                    onValueChange={(s) => onQuickStatus?.(c, s)}
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
                  <DropdownMenuItem onClick={() => onOpenDetail?.(c)}>
                    Ver detalhes
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit?.(c)}>Editar</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete?.(c)}>
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

export default ContractsTable;
