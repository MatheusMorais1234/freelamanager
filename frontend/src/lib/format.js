// Funcoes de formatacao para exibicao.

// O backend manda o valor como STRING ("4500.75") para nao
// perder centavos. So convertemos para numero na hora de EXIBIR.
export function formatMoney(value) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Para preencher <input type="date">, que exige "AAAA-MM-DD".
export function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

export const STATUS_LABEL = {
  PENDING: "Pendente",
  ACTIVE: "Em andamento",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
};

export const STATUS_LIST = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];
