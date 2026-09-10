// ============================================================
// Listas fechadas usadas pela API
// ------------------------------------------------------------
// As mesmas listas eram escritas de novo em cada arquivo de
// rota. O problema de copiar nao e o tamanho: e que no dia em
// que uma forma de pagamento nova entrar, ela vai entrar em um
// lugar so - e /payments passaria a aceitar um valor que
// /reports nao sabe somar, sem ninguem quebrar.
//
// Aqui elas tambem viram a fonte unica do que o Zod valida
// (z.enum) e do que o relatorio percorre.
// ============================================================

/** Formas de recebimento de uma parcela. */
export const PAYMENT_METHODS = ["PIX", "TRANSFER", "BOLETO", "CARD", "CASH", "OTHER"];

/**
 * Situacao de uma parcela. NAO existe no banco: e derivada do
 * vencimento e da data de recebimento (ver payment-status.js).
 */
export const PAYMENT_STATUSES = ["PENDING", "PAID", "OVERDUE"];

/** Situacao de um contrato. Essa sim e uma coluna do banco. */
export const CONTRACT_STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];
