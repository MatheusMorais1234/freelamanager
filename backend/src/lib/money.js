// ============================================================
// Valores em dinheiro no JSON
// ------------------------------------------------------------
// O Prisma devolve Decimal como objeto, para nao perder
// precisao. JSON nao tem tipo decimal, e Number perderia
// centavos em contas como 6666.68 - por isso o valor viaja como
// STRING e so vira numero na formatacao da tela.
//
// Uma soma sem nenhuma linha volta como null (o SUM do SQL de
// um conjunto vazio), e "null" na tela nao e zero: o ?? 0 e o
// que faz a API responder "0" em vez de sumir com o campo.
// ============================================================

/** Decimal (ou null) -> string. */
export function money(value) {
  return (value ?? 0).toString();
}

/**
 * Formato padrao de um total agregado: quantas parcelas e
 * quanto somam. E o mesmo desenho em /payments/summary e em
 * /reports, entao as duas telas leem o mesmo objeto.
 *
 * Espera um aggregate pedido com _count: { _all: true } e
 * _sum: { amount: true }.
 */
export function box(agg) {
  return {
    count: agg._count._all,
    total: money(agg._sum.amount),
  };
}
