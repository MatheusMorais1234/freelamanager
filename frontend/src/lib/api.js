// ============================================================
// Cliente HTTP - unico ponto do app que fala com a API
// ------------------------------------------------------------
// Centralizar aqui significa que a URL da API, o envio do token
// e o tratamento de erro existem em UM lugar so. Se amanha o
// backend mudar de endereco, muda-se uma linha.
// ============================================================

// import.meta.env e como o Vite expoe variaveis de ambiente.
// So variaveis com prefixo VITE_ ficam disponiveis no navegador -
// e uma protecao para nao vazar segredo sem querer.
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const TOKEN_KEY = "freelamanager:token";

export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Erro customizado: carrega o status HTTP e os erros por campo
// que o backend devolve, para o formulario saber onde marcar.
export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || {};
  }
}

async function request(method, path, body) {
  const token = tokenStorage.get();

  const res = await fetch(BASE_URL + path, {
    method,
    headers: {
      "Content-Type": "application/json",
      // So manda o cabecalho Authorization se houver token.
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // 204 = sucesso sem corpo (usado no DELETE)
  if (res.status === 204) return null;

  let data = null;
  try {
    data = await res.json();
  } catch {
    // resposta sem JSON valido
  }

  if (!res.ok) {
    // 401 = token invalido/expirado -> derruba a sessao
    if (res.status === 401) tokenStorage.clear();
    throw new ApiError(data?.error || "Erro na requisicao", res.status, data?.fields);
  }

  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};
