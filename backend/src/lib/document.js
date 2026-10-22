// Validacao de CPF/CNPJ (digitos verificadores)

export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

// soma ponderada, resto da divisao por 11
function checkDigit(digits, weights) {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;

  // 111.111.111-11 e afins passam na conta mas sao invalidos
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const d = cpf.split("").map(Number);
  const first = checkDigit(d.slice(0, 9), [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const second = checkDigit(d.slice(0, 10), [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);

  return d[9] === first && d[10] === second;
}

export function isValidCNPJ(value) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(cnpj)) return false;

  const d = cnpj.split("").map(Number);
  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const first = checkDigit(d.slice(0, 12), w1);
  const second = checkDigit(d.slice(0, 13), w2);

  return d[12] === first && d[13] === second;
}

// Vazio e valido (documento e opcional)
export function isValidDocument(value, type) {
  const digits = onlyDigits(value);
  if (!digits) return true;
  return type === "COMPANY" ? isValidCNPJ(digits) : isValidCPF(digits);
}
