// Ponto de entrada do React: pega a <div id="root"> do
// index.html e desenha o App dentro dela.

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
