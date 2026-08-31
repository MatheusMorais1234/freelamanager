// ============================================================
// Ferramentas usadas por todos os testes
// ------------------------------------------------------------
// A ideia central: cada teste cria a PROPRIA conta, com e-mail
// aleatorio, e apaga tudo no fim. Como cada linha do banco
// pertence a um usuario (e o delete do usuario leva clientes,
// contratos e parcelas junto, pelo onDelete: Cascade), os
// testes nao esbarram uns nos outros nem sujam o banco de
// desenvolvimento.
//
// Nao ha banco separado de proposito: o projeto e didatico e
// nao pede infraestrutura extra para rodar.
// ============================================================

import request from "supertest";
import { randomUUID } from "node:crypto";

import app from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export { app, request };

/** E-mail que nunca colide com outro teste nem com dado real. */
export function emailUnico(prefixo = "teste") {
  return `${prefixo}-${randomUUID().slice(0, 8)}@teste.local`;
}

/**
 * Cria uma conta e devolve o token junto de atalhos que ja
 * mandam o cabecalho de autenticacao. Sem isso, cada chamada
 * repetiria .set("Authorization", `Bearer ${token}`).
 */
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

/** Apaga as contas criadas no teste - e, em cascata, os dados delas. */
export async function apagarUsuarios(...usuarios) {
  const ids = usuarios.filter(Boolean).map((u) => u.id);
  if (ids.length === 0) return;

  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

/**
 * Atalho para o cenario mais comum: uma conta com um cliente e
 * um contrato prontos, que e o minimo para testar parcelas.
 */
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
