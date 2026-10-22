// Status da parcela e calculado (paidAt x dueDate x hoje), nao fica gravado.

import { money } from "./money.js";

// meia-noite UTC de hoje (datas sao @db.Date)
export function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export function statusOf(payment, today = startOfToday()) {
  if (payment.paidAt) return "PAID";
  return payment.dueDate < today ? "OVERDUE" : "PENDING";
}

// Mesma regra do statusOf, mas como where do prisma
export function paymentWhere(status, today = startOfToday()) {
  const porStatus = {
    PAID: { paidAt: { not: null } },
    PENDING: { paidAt: null, dueDate: { gte: today } },
    OVERDUE: { paidAt: null, dueDate: { lt: today } },
  };

  return porStatus[status] ?? {};
}

export function serializePayment(payment, today = startOfToday()) {
  return {
    ...payment,
    amount: money(payment.amount),
    status: statusOf(payment, today),
  };
}
