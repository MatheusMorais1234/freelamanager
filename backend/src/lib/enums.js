// Enums compartilhados entre as rotas e o zod

export const PAYMENT_METHODS = ["PIX", "TRANSFER", "BOLETO", "CARD", "CASH", "OTHER"];

// derivado, nao existe no banco (ver payment-status.js)
export const PAYMENT_STATUSES = ["PENDING", "PAID", "OVERDUE"];

export const CONTRACT_STATUSES = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];
