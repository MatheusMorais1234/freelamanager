// ============================================================
// useApiData - carregar dados da API sem repetir (e sem corrida)
// ------------------------------------------------------------
// POR QUE EXISTE:
//
// 1. O mesmo bloco - useCallback + setLoading(true) + try /
//    catch / finally + useEffect - estava copiado em SETE
//    lugares (Clients, Contracts, Payments, Dashboard, Reports,
//    ClientDetail, ContractDetail). Sete copias e sete chances
//    de esquecer o finally e deixar a tela carregando para
//    sempre.
//
// 2. E, mais grave: nenhuma delas cancelava o efeito anterior.
//    Abrir o contrato A e clicar no B antes de A responder
//    fazia a resposta ATRASADA de A chegar depois da de B e
//    sobrescrever a tela - o usuario via os dados do contrato
//    errado, sem nenhum erro no console. E a chamada "condicao
//    de corrida" (race condition).
//
//    A correcao e a flag "cancelado" no cleanup do useEffect:
//    o React roda esse cleanup ANTES de disparar o efeito novo,
//    entao a resposta que chegar depois encontra a flag ligada e
//    joga o proprio resultado fora em vez de chamar setState.
//    Nao da para "abortar" uma Promise ja em voo; o que da para
//    fazer e ignorar o resultado dela.
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * @param {Function} buscar  funcao async que devolve os dados
 * @param {Array}    deps    quando refazer a busca (como no useEffect)
 * @returns {{ data, loading, error, reload }}
 */
/**
 * Lista vazia unica, para o periodo em que `data` ainda e null.
 *
 * POR QUE UMA CONSTANTE E NAO `?? []`: escrito inline, o `[]` e
 * um array NOVO a cada render. Os useMemo que dependem dessa
 * lista veem uma referencia diferente toda vez e recalculam
 * sempre - o memo vira enfeite. Uma constante de modulo tem
 * sempre a mesma identidade, e o memo volta a valer.
 */
export const LISTA_VAZIA = [];

export function useApiData(buscar, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // A funcao de busca vive numa ref para nao entrar nas
  // dependencias do efeito: a pagina normalmente a escreve
  // inline (`() => api.get(...)`), o que cria uma funcao nova a
  // cada render e faria o efeito rodar em loop infinito. Quem
  // manda no "quando recarregar" e o array `deps`.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

  // Guarda o cleanup do carregamento em andamento para que o
  // reload() manual tambem consiga invalidar o anterior.
  const cancelarAtual = useRef(null);

  const carregar = useCallback(async () => {
    cancelarAtual.current?.();

    let cancelado = false;
    cancelarAtual.current = () => {
      cancelado = true;
    };

    setLoading(true);
    setError("");

    try {
      const resultado = await buscarRef.current();
      if (cancelado) return;
      setData(resultado);
    } catch (err) {
      if (cancelado) return;
      setError(err.message);
    } finally {
      // O finally tambem precisa do guarda: sem ele, a resposta
      // velha desligaria o "carregando" da busca nova.
      if (!cancelado) setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
    return () => cancelarAtual.current?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: carregar };
}

export default useApiData;
