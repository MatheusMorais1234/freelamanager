// ============================================================
// DueHint - aviso curto ao lado de uma data de vencimento
// ------------------------------------------------------------
// POR QUE EXISTE: "3 dia(s) em atraso" / "vence hoje" /
// "em 5 dia(s)" estava escrito tres vezes, em tres arquivos, com
// a mesma cadeia de ternarios copiada (Contracts, Payments e um
// bloco solto no Dashboard). A frase em si agora e a funcao pura
// dueLabel() em lib/format.js - da para testar sem tela.
//
// O que NAO foi unificado: QUANDO esconder o aviso. Cada tela
// tem a sua regra (contrato concluido, parcela ja recebida,
// prazo ainda longe), e amarrar todas em uma condicao so
// deixaria o componente cheio de casos particulares. Por isso a
// prop "hide": a decisao continua na pagina, so a aparencia vem
// para ca.
// ============================================================

import { cn } from "@/lib/utils.js";
import { daysUntil, dueLabel } from "@/lib/format.js";

/**
 * @param {string|Date} dueDate
 * @param {boolean} hide  a pagina decide quando o aviso nao cabe
 * @param {boolean} mute  em painel, o aviso "no prazo" fica discreto
 */
export function DueHint({ dueDate, hide = false, mute = false }) {
  if (!dueDate || hide) return null;

  const days = daysUntil(dueDate);
  if (days === null) return null;

  const late = days < 0;

  return (
    <span
      className={cn(
        "text-xs",
        late
          ? "font-medium text-destructive"
          : mute
            ? "text-muted-foreground"
            : "text-primary"
      )}
    >
      {dueLabel(days)}
    </span>
  );
}

export default DueHint;
