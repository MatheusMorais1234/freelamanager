// ============================================================
// Tema claro / escuro
// ------------------------------------------------------------
// A paleta inteira ja existe nos dois tons dentro do index.css.
// O que faltava era alguem para dizer qual dos dois vale agora:
// e isso que este contexto faz, ligando/desligando a classe
// "dark" no <html>.
//
// A escolha fica no localStorage. Sem isso o app voltaria ao
// padrao a cada F5, o que parece um bug para quem usa.
// ============================================================

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "freelamanager:theme";

const ThemeContext = createContext(null);

// Le a preferencia salva; na primeira visita, segue o tema do
// sistema operacional do usuario em vez de impor o nosso.
function readInitialTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") return saved;

  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  return prefersLight ? "light" : "dark";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme);

  // Efeito colateral unico: a classe no <html>. Nenhum
  // componente precisa saber disso - todos leem os tokens.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((atual) => (atual === "dark" ? "light" : "dark")),
    []
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme precisa estar dentro de <ThemeProvider>");
  return ctx;
}
