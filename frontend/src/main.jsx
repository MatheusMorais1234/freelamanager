// Ponto de entrada do React: pega a <div id="root"> do
// index.html e desenha o App dentro dela.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { ThemeProvider } from "@/context/ThemeContext.jsx";
import { Toaster } from "@/components/ui/sonner.jsx";
import { TooltipProvider } from "@/components/ui/tooltip.jsx";
import "./index.css";

// O tema (claro/escuro) e resolvido pelo ThemeProvider. O
// index.html ja aplicou a escolha salva antes desta linha
// rodar, entao aqui nao ha piscada.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      {/* O Tooltip do Radix precisa de um provedor acima dele.
          Fica aqui, uma vez so, em vez de repetido em cada tela. */}
      <TooltipProvider delayDuration={200}>
        <App />
        {/* Avisos de sucesso/erro das acoes, no canto da tela */}
        <Toaster position="bottom-right" richColors closeButton />
      </TooltipProvider>
    </ThemeProvider>
  </StrictMode>
);
