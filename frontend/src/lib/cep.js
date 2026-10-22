// Busca CEP no ViaCEP. Se falhar o usuario preenche na mao.

import { onlyDigits } from "./format.js";

export async function lookupZip(zipCode) {
  const cep = onlyDigits(zipCode);
  if (cep.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) return null;

    const data = await res.json();
    // ViaCEP devolve 200 com { erro: true } quando nao acha
    if (data.erro) return null;

    return {
      street: data.logradouro || "",
      district: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
    };
  } catch {
    return null;
  }
}
