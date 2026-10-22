// Parcelamento

// Divide em centavos pra nao sumir centavo; a sobra vai pra 1a parcela
export function splitAmount(total, parts) {
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / parts);
  const rest = cents - base * parts;

  return Array.from({ length: parts }, (_, i) => (base + (i === 0 ? rest : 0)) / 100);
}

// Soma N meses. 31 em mes curto cai no ultimo dia.
export function addMonths(date, months) {
  const d = new Date(date);
  const day = d.getUTCDate();

  // vai pro dia 1 antes, senao 31/01 + 1 mes vira 03/03
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);

  const lastDay = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)
  ).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));

  return d;
}
