
import { createContext, useContext, useEffect, useState } from "react";
import { api, tokenStorage } from "../lib/api.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // evita piscar a tela de login
  const [loading, setLoading] = useState(true);

  // confere se o token salvo ainda vale
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
