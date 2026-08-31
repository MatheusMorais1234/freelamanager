// ============================================================
// app.js - monta a aplicacao Express
// ------------------------------------------------------------
// Este arquivo NAO liga o servidor. Ele so monta o "app" e o
// exporta. Quem liga na porta e o server.js.
// ============================================================

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
// ROTAS
// ------------------------------------------------------------

// GET /health -> "o servidor esta vivo?"
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Cada grupo de rotas mora no seu arquivo e e "montado" num
// prefixo. Ex.: o "/login" dentro de auth.routes.js vira
// "/auth/login" aqui.
app.use("/auth", authRoutes);
app.use("/clients", clientsRoutes);
app.use("/contracts", contractsRoutes);
app.use("/payments", paymentsRoutes);
app.use("/reports", reportsRoutes);

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
