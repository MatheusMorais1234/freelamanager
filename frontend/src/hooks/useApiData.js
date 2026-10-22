// Hook de fetch com loading/erro. O cleanup marca "cancelado" pra ignorar\nresposta atrasada (abrir A e depois B mostrava os dados de A).

import { useCallback, useEffect, useRef, useState } from "react";

// constante pra manter a mesma referencia (com ?? [] o useMemo recalcula sempre)
export const LISTA_VAZIA = [];

export function useApiData(buscar, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ref pra funcao inline nao disparar o efeito toda hora; quem manda e o deps
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;

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
