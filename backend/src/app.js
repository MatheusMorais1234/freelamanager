
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

// CORS so importa em dev; em producao e a mesma origem
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  })
);

app.use(express.json());

// Rotas da API. Em producao ficam em /api (API_PREFIX)
const api = express.Router();

api.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

api.use("/auth", authRoutes);
api.use("/clients", clientsRoutes);
api.use("/contracts", contractsRoutes);
api.use("/payments", paymentsRoutes);
api.use("/reports", reportsRoutes);

// 404 da API em JSON
api.use((req, res) => {
  res.status(404).json({ error: "Rota nao encontrada" });
});

const prefix = process.env.API_PREFIX || "";
app.use(prefix || "/", api);

// Em producao serve o build do React
const dist = fileURLToPath(new URL("../../frontend/dist", import.meta.url));

if (prefix && existsSync(dist)) {
  // assets tem hash no nome, pode cachear
  app.use("/assets", express.static(`${dist}/assets`, { maxAge: "1y", immutable: true }));
  app.use(express.static(dist, { index: false }));
  app.get("/{*rota}", (req, res) => {
    res.set("Cache-Control", "no-cache");
    res.sendFile("index.html", { root: dist });
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Rota nao encontrada" });
});

// handler de erro (4 params)
app.use((err, req, res, next) => {
  console.error("[erro]", err);
  res.status(500).json({ error: "Erro interno do servidor" });
});

export default app;
