// ============================================================
// Isolamento entre usuarios
// ------------------------------------------------------------
// O teste mais importante do projeto. O sistema guarda dados de
// varios freelancers na MESMA tabela; o que separa um do outro
// e o filtro por userId em toda consulta. Se esse filtro cair
// em alguma rota, um usuario passa a ver a carteira de clientes
// do outro - e nenhuma tela acusaria o problema.
//
// A regra esperada e 404, nao 403: responder "existe, mas voce
// nao pode" ja entrega que aquele id existe.
// ============================================================

import { describe, it, expect, beforeAll, afterAll } from "vitest";

import { criarUsuario, criarCenario, apagarUsuarios, prisma } from "./helpers.js";

let dono; // criou os dados
let intruso; // tenta alcancar os dados do dono
let cliente;
let contrato;
let parcela;

beforeAll(async () => {
  const cenario = await criarCenario({ amount: 5000 });
  dono = cenario.usuario;
  cliente = cenario.cliente;
  contrato = cenario.contrato;

  const res = await dono.post("/payments", {
    contractId: contrato.id,
    amount: 5000,
    dueDate: "2026-12-10",
    description: "Parcela unica",
  });
  parcela = res.body.payments?.[0] ?? res.body.payment;

  intruso = await criarUsuario("Intruso");
});

afterAll(async () => {
  await apagarUsuarios(dono, intruso);
  await prisma.$disconnect();
});

describe("listagens so mostram o que e seu", () => {
  it("o intruso ve as proprias listas vazias", async () => {
    const clientes = await intruso.get("/clients");
    const contratos = await intruso.get("/contracts");
    const parcelas = await intruso.get("/payments");

    expect(clientes.body.clients).toHaveLength(0);
    expect(contratos.body.contracts).toHaveLength(0);
    expect(parcelas.body.payments).toHaveLength(0);
  });

  it("os totais do intruso nao contam o dinheiro do dono", async () => {
    const stats = await intruso.get("/contracts/stats");
    const resumo = await intruso.get("/payments/summary");

    expect(stats.body.stats.totalClients).toBe(0);
    expect(stats.body.stats.totalContracts).toBe(0);
    expect(Number(resumo.body.summary.paid.total)).toBe(0);
    expect(Number(resumo.body.summary.pending.total)).toBe(0);
  });
});

describe("leitura direta pelo id", () => {
  it("cliente de outro usuario responde 404", async () => {
    const res = await intruso.get(`/clients/${cliente.id}`);
    expect(res.status).toBe(404);
  });

  it("contrato de outro usuario responde 404", async () => {
    const res = await intruso.get(`/contracts/${contrato.id}`);
    expect(res.status).toBe(404);
  });

  it("parcela de outro usuario responde 404", async () => {
    const res = await intruso.get(`/payments/${parcela.id}`);
    expect(res.status).toBe(404);
  });
});

describe("escrita nos dados alheios", () => {
  it("nao consegue editar o cliente do dono", async () => {
    const res = await intruso.put(`/clients/${cliente.id}`, { name: "Invadido" });
    expect(res.status).toBe(404);

    // E o nome continua o mesmo para quem e dono.
    const conferindo = await dono.get(`/clients/${cliente.id}`);
    expect(conferindo.body.client.name).toBe("Cliente de Teste");
  });

  it("nao consegue apagar o cliente do dono", async () => {
    const res = await intruso.delete(`/clients/${cliente.id}`);
    expect(res.status).toBe(404);

    const conferindo = await dono.get(`/clients/${cliente.id}`);
    expect(conferindo.status).toBe(200);
  });

  it("nao consegue editar nem apagar o contrato do dono", async () => {
    const editar = await intruso.put(`/contracts/${contrato.id}`, {
      clientId: cliente.id,
      title: "Invadido",
      amount: 1,
    });
    const apagar = await intruso.delete(`/contracts/${contrato.id}`);

    expect(editar.status).toBe(404);
    expect(apagar.status).toBe(404);
  });

  it("nao consegue dar baixa na parcela do dono", async () => {
    const res = await intruso.patch(`/payments/${parcela.id}/settle`, { paid: true });
    expect(res.status).toBe(404);

    // A parcela segue em aberto.
    const conferindo = await dono.get(`/payments/${parcela.id}`);
    expect(conferindo.body.payment.paidAt).toBeNull();
  });
});

describe("criacao apontando para dados alheios", () => {
  it("nao consegue criar contrato no cliente do dono", async () => {
    // Se essa checagem faltasse, o intruso escreveria dentro da
    // carteira de outra pessoa apenas adivinhando um id.
    const res = await intruso.post("/contracts", {
      clientId: cliente.id,
      title: "Contrato intruso",
      amount: 100,
    });

    expect(res.status).toBe(404);
  });

  it("nao consegue criar parcela no contrato do dono", async () => {
    const res = await intruso.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: "2026-12-10",
    });

    expect(res.status).toBe(404);
  });

  it("o userId vem do token, nao do corpo da requisicao", async () => {
    // Mandar userId do dono no body nao pode transferir o
    // registro: o backend ignora esse campo e usa o token.
    const res = await intruso.post("/clients", {
      name: "Tentativa de troca de dono",
      userId: dono.id,
    });

    expect(res.status).toBe(201);
    expect(res.body.client.userId).toBe(intruso.id);

    const naListaDoDono = await dono.get("/clients");
    const nomes = naListaDoDono.body.clients.map((c) => c.name);
    expect(nomes).not.toContain("Tentativa de troca de dono");
  });
});
