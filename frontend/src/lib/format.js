// ============================================================
// Formatacao para exibicao e mascaras de digitacao
// ------------------------------------------------------------
// Regra do projeto: o banco guarda documento, telefone e CEP
// apenas com DIGITOS. A pontuacao existe so na tela. Isso evita
// que "123.456.789-00" e "12345678900" virem cadastros
// diferentes, e deixa a busca simples.
// ============================================================

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

// ---------- Exibicao ----------

// O backend manda o valor como STRING ("4500.75") para nao
// perder centavos. So convertemos para numero na hora de EXIBIR.
export function formatMoney(value) {
  const n = Number(value ?? 0);
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// Versao curta para eixos de grafico: R$ 12,5 mil
export function formatMoneyShort(value) {
  const n = Number(value ?? 0);
  if (Math.abs(n) >= 1_000_000) return `R$ ${(n / 1_000_000).toFixed(1)} mi`;
  if (Math.abs(n) >= 1_000) return `R$ ${(n / 1_000).toFixed(1)} mil`;
  return `R$ ${n.toFixed(0)}`;
}

export function formatDate(value) {
  if (!value) return "—";
  // timeZone UTC: a data vem como "2026-03-10" e sem isso o
  // navegador em fuso negativo mostraria 09/03.
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

// Para preencher <input type="date">, que exige "AAAA-MM-DD".
export function toInputDate(value) {
  if (!value) return "";
  return new Date(value).toISOString().slice(0, 10);
}

// "há 3 dias", "em 2 meses" - usa a API nativa do navegador.
export function formatRelative(value) {
  if (!value) return "";
  const days = Math.round((new Date(value) - new Date()) / 86_400_000);
  const rtf = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (Math.abs(days) < 31) return rtf.format(days, "day");
  return rtf.format(Math.round(days / 30), "month");
}

/** Quantos dias faltam para o prazo. Negativo = atrasado. */
export function daysUntil(value) {
  if (!value) return null;
  const due = new Date(value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((due - today) / 86_400_000);
}

// ---------- Documentos ----------

export function formatCPF(value) {
  return onlyDigits(value)
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function formatCNPJ(value) {
  return onlyDigits(value)
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

export function formatDocument(value, type) {
  if (!value) return "—";
  return type === "COMPANY" ? formatCNPJ(value) : formatCPF(value);
}

// ---------- Telefone e CEP ----------

// Aceita fixo (10 digitos) e celular (11 digitos).
export function formatPhone(value) {
  const d = onlyDigits(value).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

export function formatZip(value) {
  return onlyDigits(value)
    .slice(0, 8)
    .replace(/(\d{5})(\d{1,3})$/, "$1-$2");
}

// ---------- Validacao (espelha o backend) ----------

function checkDigit(digits, weights) {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const d = cpf.split("").map(Number);
  return (
    d[9] === checkDigit(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    d[10] === checkDigit(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2])
  );
}

export function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const d = cnpj.split("").map(Number);
  return (
    d[12] === checkDigit(d.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) &&
    d[13] === checkDigit(d.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
  );
}

/** Documento em branco e aceito: nem todo cliente informa o seu. */
export function isValidDocument(value, type) {
  if (!onlyDigits(value)) return true;
  return type === "COMPANY" ? isValidCNPJ(value) : isValidCPF(value);
}

// ---------- Rotulos ----------

export const STATUS_LABEL = {
  PENDING: "Pendente",
  ACTIVE: "Em andamento",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const STATUS_LIST = ["PENDING", "ACTIVE", "COMPLETED", "CANCELLED"];

// ---------- Pagamentos ----------

// O status de uma parcela nao vem gravado no banco: o backend o
// calcula comparando a data de recebimento, o vencimento e hoje.
// Aqui so damos nome a cada um dos tres casos.
export const PAYMENT_STATUS_LABEL = {
  PENDING: "A receber",
  PAID: "Recebido",
  OVERDUE: "Atrasado",
};

export const PAYMENT_STATUS_LIST = ["PENDING", "PAID", "OVERDUE"];

export const PAYMENT_METHOD_LABEL = {
  PIX: "Pix",
  TRANSFER: "Transferência",
  BOLETO: "Boleto",
  CARD: "Cartão",
  CASH: "Dinheiro",
  OTHER: "Outro",
};

export const PAYMENT_METHOD_LIST = ["PIX", "TRANSFER", "BOLETO", "CARD", "CASH", "OTHER"];

/**
 * Quanto de um contrato ja foi recebido, de 0 a 100.
 * Contrato de valor zero devolve 100 - senao a divisao daria
 * NaN e a barra de progresso sumiria da tela.
 */
export function paidPercent(paid, total) {
  const t = Number(total ?? 0);
  if (t <= 0) return 100;
  return Math.min(100, Math.round((Number(paid ?? 0) / t) * 100));
}

export const CLIENT_TYPE_LABEL = {
  PERSON: "Pessoa física",
  COMPANY: "Pessoa jurídica",
};

export const UF_LIST = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

/** Iniciais para o avatar: "Maria Silva Souza" -> "MS" */
export function initials(name) {
  const parts = String(name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts.at(-1)[0]).toUpperCase();
}
