// ============================================================
// app.js - monta a aplicacao Express
// ------------------------------------------------------------
// Este arquivo NAO liga o servidor. Ele so monta o "app" e o
// exporta. Quem liga na porta e o server.js.
// ============================================================

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";

import authRoutes from "./routes/auth.routes.js";
import clientsRoutes from "./routes/clients.routes.js";
import contractsRoutes from "./routes/contracts.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import reportsRoutes from "./routes/reports.routes.js";

const app = express();

// ------------------------------------------------------------
// MIDDLEWARES
// Um middleware e uma funcao que TODA requisicao atravessa
// antes de chegar na rota. A ordem aqui importa.
// ------------------------------------------------------------

// 1) CORS: autoriza o frontend a chamar esta API.
//    Sem isso o navegador bloqueia as requisicoes do React.
//    Em producao o frontend e servido por este mesmo app (mesma
//    origem), entao o CORS so importa no desenvolvimento.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);

// 2) express.json(): le o corpo das requisicoes que vem em JSON
//    e disponibiliza como objeto JS em req.body.
//    Sem isso, req.body seria undefined nos POST/PUT.
app.use(express.json());

// ------------------------------------------------------------
// ROTAS DA API
// ------------------------------------------------------------
// Todas as rotas moram num Router, montado num prefixo:
//   - desenvolvimento e testes: sem prefixo  (/auth/login)
//   - producao: API_PREFIX="/api"           (/api/auth/login)
// Em producao o prefixo e obrigatorio, porque as telas do React
// usam os mesmos caminhos (/clients, /contracts...) e o servidor
// precisa saber quando devolver JSON e quando devolver a tela.
const api = express.Router();

// GET /health -> "o servidor esta vivo?"
api.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Cada grupo de rotas mora no seu arquivo e e "montado" num
// prefixo. Ex.: o "/login" dentro de auth.routes.js vira
// "/auth/login" aqui.
api.use("/auth", authRoutes);
api.use("/clients", clientsRoutes);
api.use("/contracts", contractsRoutes);
api.use("/payments", paymentsRoutes);
api.use("/reports", reportsRoutes);

// 404 da API: caminho que nao existe. Fica dentro do Router para
// que /api/qualquer-coisa responda JSON, e nao a tela do React.
api.use((req, res) => {
  res.status(404).json({ error: "Rota nao encontrada" });
});

const prefix = process.env.API_PREFIX || "";
app.use(prefix || "/", api);

// ------------------------------------------------------------
// FRONTEND (so em producao)
// ------------------------------------------------------------
// Se o build do React existir (frontend/dist), este mesmo app
// serve as telas. Qualquer GET que nao seja da API devolve o
// index.html e o React Router decide o que mostrar.
const dist = fileURLToPath(new URL("../../frontend/dist", import.meta.url));

if (prefix && existsSync(dist)) {
  // /assets tem hash no nome do arquivo (o Vite troca a cada build),
  // entao pode ficar um ano em cache. O resto (favicon etc.), nao.
  app.use("/assets", express.static(`${dist}/assets`, { maxAge: "1y", immutable: true }));
  app.use(express.static(dist, { index: false }));
  app.get("/{*rota}", (req, res) => {
    // o index.html muda a cada deploy: nunca guardar em cache
    res.set("Cache-Control", "no-cache");
    res.sendFile("index.html", { root: dist });
  });
}

// ------------------------------------------------------------
// TRATAMENTO DE ERROS
// Fica DEPOIS das rotas: so chega aqui quem nao casou com nenhuma.
// ------------------------------------------------------------

// 404: caminho que nao existe
app.use((req, res) => {
  res.status(404).json({ error: "Rota nao encontrada" });
});

// 500: qualquer erro nao tratado que estourar dentro de uma rota.
// O Express reconhece este middleware por ele ter 4 parametros.
app.use((err, req, res, next) => {
  console.error("[erro]", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
