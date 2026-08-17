// Ponto de entrada do React: pega a <div id="root"> do
// index.html e desenha o App dentro dela.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import { Toaster } from "@/components/ui/sonner.jsx";
import "./index.css";

// O tema escuro e o padrao do produto. A classe fica no <html>
// porque os tokens do shadcn sao definidos em ".dark".
document.documentElement.classList.add("dark");

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
    {/* Avisos de sucesso/erro das acoes, no canto da tela */}
    <Toaster position="bottom-right" richColors closeButton />
  </StrictMode>
);
