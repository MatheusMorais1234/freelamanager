// ============================================================
// ProgressBar - trilho + preenchimento de 0 a 100
// ------------------------------------------------------------
// POR QUE EXISTE: a mesma barra estava escrita em tres lugares
// (lista de contratos, detalhe do contrato e relatorio), cada
// uma com uma altura e - o que importa mais - so UMA delas
// tinha os atributos ARIA. Nas outras duas, quem usa leitor de
// tela nao recebia nada: a barra era um <div> mudo.
//
// Aqui role="progressbar" e o aria-valuenow sao SEMPRE
// emitidos. Quando o texto ao lado ja repete a informacao, a
// pagina passa aria-hidden e a barra vira enfeite de proposito
// - o que e diferente de esquecer.
// ============================================================

import { cn } from "@/lib/utils.js";

/**
 * @param {number}  value      percentual de 0 a 100
 * @param {string}  className  largura/altura do trilho (ex.: "h-2 w-16")
 * @param {string}  barClassName  cor do preenchimento (ex.: "bg-success")
 * @param {string}  label      descricao para leitor de tela
 */
export function ProgressBar({
  value = 0,
  className,
  barClassName = "bg-primary",
  label = "Progresso",
}) {
  // Trava a faixa: um valor fora de 0-100 vazaria do trilho e
  // ainda mentiria no aria-valuenow.
  const percent = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-muted", className)}
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-all", barClassName)}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default ProgressBar;
