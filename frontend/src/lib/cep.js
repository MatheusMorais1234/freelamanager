// ============================================================
// Busca de endereco por CEP (ViaCEP)
// ------------------------------------------------------------
// Servico publico e gratuito, sem cadastro nem chave. Enviamos
// apenas o CEP digitado - nenhum dado do cliente sai daqui.
// Se o servico estiver fora do ar, o formulario continua
// funcionando: o usuario so preenche o endereco na mao.
// ============================================================

import { onlyDigits } from "./format.js";

export async function lookupZip(zipCode) {
  const cep = onlyDigits(zipCode);
  if (cep.length !== 8) return null;

  try {
    // AbortSignal.timeout evita o formulario ficar preso
    // esperando para sempre se a rede travar.
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // O ViaCEP responde 200 com { erro: true } para CEP inexistente.
    if (data.erro) return null;

    return {
      street: data.logradouro || "",
      district: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    // Rede fora, tempo esgotado ou resposta invalida:
    // devolvemos null e o formulario segue manual.
    return null;
  }
}
