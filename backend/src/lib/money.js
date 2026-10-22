// Decimal do Prisma -> string no JSON. Soma vazia vem null, vira "0".

export function money(value) {
  return (value ?? 0).toString();
}

// { count, total } a partir de um aggregate com _count e _sum.amount
export function box(agg) {
  return {
    count: agg._count._all,
    total: money(agg._sum.amount),
  };
}
