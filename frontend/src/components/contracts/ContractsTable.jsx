// ============================================================
// Tabela de contratos
// ------------------------------------------------------------
// A lista em si: titulo (que abre o detalhe), cliente, valor com
// a barra do quanto ja foi recebido, prazo, o selo de status que
// tambem TROCA o status, e o menu de acoes.
//
// Saiu de dentro de pages/Contracts.jsx porque a pagina tinha
// virado 667 linhas em que a marcacao da tabela escondia a
// logica de carregamento e filtro. Aqui o componente e burro de
// proposito: recebe a lista pronta e devolve os cliques por
// callback - quem decide o que fazer continua sendo a pagina.
// ============================================================

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

/**
 * Quanto do contrato ja foi recebido, em barra e em texto.
 * O numero vem pronto do backend (campo paidAmount), somado a
 * partir das parcelas com data de recebimento.
 */
function PaidProgress({ paid, total }) {
  const value = Number(paid ?? 0);
  if (value <= 0) return null;

  const percent = paidPercent(value, total);
  const done = percent >= 100;

  return (
    <div className="mt-1 flex items-center justify-end gap-2">
      {/* aria-hidden aqui e escolha, nao esquecimento: o texto ao
          lado ja diz a mesma coisa em palavras, e o ProgressBar
          sozinho anunciaria o percentual duas vezes. */}
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

/**
 * @param {Array}    contracts    ja filtrados pela pagina
 * @param {string}   updatingId   linha com troca de status em andamento
 * @param {Function} onOpenDetail (contrato) => void
 * @param {Function} onQuickStatus (contrato, status) => void
 * @param {Function} onEdit       (contrato) => void
 * @param {Function} onDelete     (contrato) => void
 */
export function ContractsTable({
  contracts = [],
  updatingId,
  onOpenDetail,
  onQuickStatus,
  onEdit,
  onDelete,
}) {
  return (
    // Sem <div overflow-x-auto> por fora: ui/table.jsx ja embrulha
    // a tabela em um container com rolagem horizontal, e o segundo
    // so criava uma barra dentro da outra.
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
              {/* Clicar no titulo abre o detalhe: e o gesto que a
                  pessoa ja tenta antes de procurar o menu de tres
                  pontinhos. Os tokens de foco sao os mesmos do
                  ui/button.jsx - o botao tinha so hover, entao por
                  teclado nao dava para ver onde se estava. */}
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
              {/* Quando o aviso nao cabe e decisao DESTA tela:
                  contrato concluido ou cancelado nao tem prazo que
                  importe, e prazo a mais de uma semana ainda nao e
                  assunto. */}
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
              {/* Menu de status: troca rapida sem abrir o
                  formulario inteiro. O gatilho e um Button de
                  verdade (asChild) para herdar o anel de foco e
                  poder carregar um aria-label - antes era um
                  <button> cru, mudo e invisivel ao teclado. */}
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
                      // Casca do selo repetida a mao: o StatusBadge
                      // ainda nao tem um estado "salvando". Se ele
                      // ganhar um, este bloco sai daqui.
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
