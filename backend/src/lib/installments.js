// ============================================================
// Parcelamento: como um valor vira N vencimentos
// ------------------------------------------------------------
// Duas regras curtas e densas, que estavam no meio das rotas de
// pagamento. Nao dependem de Express nem de banco - sao contas
// puras -, entao moram aqui, onde da para ler as duas sem
// atravessar 400 linhas de rota.
// ============================================================

/**
 * Divide um total em N parcelas SEM PERDER CENTAVO.
 * Trabalha em centavos (inteiros) porque 100 / 3 em ponto
 * flutuante daria 33.33 tres vezes = 99.99, sumindo um centavo.
 * A sobra vai para a primeira parcela.
 */
export function splitAmount(total, parts) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const rest = cents - base * parts;

  return Array.from({ length: parts }, (_, i) => (base + (i === 0 ? rest : 0)) / 100);
}

/** Mesma data, N meses adiante. Dia 31 em mes curto cai no ultimo dia. */
export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();

  // Vai para o dia 1 ANTES de trocar o mes: sem isso, 31/01 + 1
  // mes viraria 03/03, porque "31 de fevereiro" transborda.
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));

  return d;
}
