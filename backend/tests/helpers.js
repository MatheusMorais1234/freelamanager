// Cada teste cria a propria conta e apaga no final (cascade limpa o resto)

import request from "supertest";
import { randomUUID } from "node:crypto";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export { app, request };

export function emailUnico(prefixo = "teste") {
  return `${prefixo}-${randomUUID().slice(0, 8)}@teste.local`;
}

// Cria conta e devolve helpers ja autenticados
export async function criarUsuario(nome = "Fulano de Teste") {
  const email = emailUnico();
  const password = "senha-de-teste-123";

  const res = await request(app)
    .post("/auth/register")
    .send({ name: nome, email, password });

  if (res.status !== 201) {
    throw new Error(`Falha ao criar usuario de teste: ${JSON.stringify(res.body)}`);
  }

  const { token, user } = res.body;
  const auth = (req) => req.set("Authorization", `Bearer ${token}`);

  return {
    id: user.id,
    email,
    password,
    token,
    get: (url) => auth(request(app).get(url)),
    post: (url, body) => auth(request(app).post(url)).send(body),
    put: (url, body) => auth(request(app).put(url)).send(body),
    patch: (url, body) => auth(request(app).patch(url)).send(body),
    delete: (url) => auth(request(app).delete(url)),
  };
}

export async function apagarUsuarios(...usuarios) {
  const ids = usuarios.filter(Boolean).map((u) => u.id);
  if (ids.length === 0) return;

  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

// conta + cliente + contrato
export async function criarCenario({ amount = 1000, status = "ACTIVE" } = {}) {
  const usuario = await criarUsuario();

  const cliente = await usuario.post("/clients", { name: "Cliente de Teste" });
  const contrato = await usuario.post("/contracts", {
    clientId: cliente.body.client.id,
    title: "Contrato de Teste",
    amount,
    status,
  });

  return {
    usuario,
    cliente: cliente.body.client,
    contrato: contrato.body.contract,
  };
}

export { prisma };
