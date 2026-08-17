// ============================================================
// Validacao de CPF e CNPJ
// ------------------------------------------------------------
// CPF e CNPJ nao sao numeros quaisquer: os ultimos digitos sao
// "digitos verificadores", calculados a partir dos anteriores.
// Conferir isso rejeita erro de digitacao ANTES de gravar - o
// que so olhar a quantidade de digitos nao pega.
// ============================================================

/** Remove tudo que nao for digito: "123.456.789-00" -> "12345678900" */
export function onlyDigits(value) {
  return String(value ?? "").replace(/\D/g, "");
}

// Regra comum ao CPF e ao CNPJ: multiplica cada digito por um
// peso, soma tudo, e o resto da divisao por 11 vira o digito.
function checkDigit(digits, weights) {
  const sum = digits.reduce((acc, d, i) => acc + d * weights[i], 0);
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

export function isValidCPF(value) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11) return false;

  // Sequencias como 111.111.111-11 passam no calculo dos
  // digitos, mas nao existem. Precisam ser barradas na mao.
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

/**
 * Valida o documento de acordo com o tipo do cliente.
 * Documento vazio e aceito: nem todo cliente informa o seu.
 */
export function isValidDocument(value, type) {
  const digits = onlyDigits(value);
  if (!digits) return true;
  return type === "COMPANY" ? isValidCNPJ(digits) : isValidCPF(digits);
}
