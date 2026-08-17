// ============================================================
// AuthContext - quem esta logado, disponivel em todo o app
// ------------------------------------------------------------
// Context do React resolve o "prop drilling": sem ele, o usuario
// logado teria que ser passado de componente em componente ate
// chegar no cabecalho. Com Context, qualquer tela pede direto.
// ============================================================

import { createContext, useContext, useEffect, useState } from "react";
import { api, tokenStorage } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" evita o pisca-pisca: sem ele, o app mostraria a
  // tela de login por um instante antes de confirmar a sessao.
  const [loading, setLoading] = useState(true);

  // Ao abrir o app: se existe token salvo, pergunta ao backend
  // se ele ainda vale. O token pode ter expirado.
  useEffect(() => {
    if (!tokenStorage.get()) {
      setLoading(false);
      return;
    }

    api
      .get("/auth/me")
      .then((data) => setUser(data.user))
      .catch(() => tokenStorage.clear())
      .finally(() => setLoading(false));
  }, []);

  async function login(email, password) {
    const data = await api.post("/auth/login", { email, password });
    tokenStorage.set(data.token);
    setUser(data.user);
  }

  async function register(name, email, password) {
    const data = await api.post("/auth/register", { name, email, password });
    tokenStorage.set(data.token);
    setUser(data.user);
  }

  function logout() {
    // O JWT nao pode ser "cancelado" no servidor - sair e
    // simplesmente jogar o token fora aqui.
    tokenStorage.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
