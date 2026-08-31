// ============================================================
// Contratos: cadastro, valores e os totais do painel
// ------------------------------------------------------------
// O ponto delicado aqui e o dinheiro. O valor trafega como
// STRING no JSON de proposito: `Decimal` do banco nao cabe em
// ponto flutuante sem risco de perder centavo, e um numero em
// JavaScript e sempre ponto flutuante.
// ============================================================

import { describe, it, expect, afterEach } from "vitest";

import { criarUsuario, criarCenario, apagarUsuarios, prisma } from "./helpers.js";

const usados = [];

async function cenario(opcoes) {
  const c = await criarCenario(opcoes);
  usados.push(c.usuario);
  return c;
}

afterEach(async () => {
  await apagarUsuarios(...usados.splice(0));
});

describe("POST /contracts", () => {
  it("cria ligado a um cliente", async () => {
    const { usuario, cliente } = await cenario();

    const res = await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Site institucional",
      amount: 7400,
      status: "ACTIVE",
      dueDate: "2026-12-20",
    });

    expect(res.status).toBe(201);
    expect(res.body.contract.title).toBe("Site institucional");
    expect(res.body.contract.clientId).toBe(cliente.id);
  });

  it("nasce PENDING quando o status nao vem", async () => {
    const { usuario, cliente } = await cenario();

    const res = await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Sem status",
      amount: 100,
    });

    expect(res.body.contract.status).toBe("PENDING");
  });

  it("recusa cliente inexistente", async () => {
    const { usuario } = await cenario();

    const res = await usuario.post("/contracts", {
      clientId: "00000000-0000-0000-0000-000000000000",
      title: "Orfao",
      amount: 100,
    });

    expect(res.status).toBe(404);
  });

  it("recusa status fora da lista e valor negativo", async () => {
    const { usuario, cliente } = await cenario();

    const statusInvalido = await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Status torto",
      amount: 100,
      status: "QUASE_PRONTO",
    });

    const valorNegativo = await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Valor negativo",
      amount: -50,
    });

    expect(statusInvalido.status).toBe(400);
    expect(valorNegativo.status).toBe(400);
  });

  it("o valor viaja como string, para nao perder centavo", async () => {
    const { usuario, cliente } = await cenario();

    const res = await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Centavos",
      amount: 1234.56,
    });

    expect(typeof res.body.contract.amount).toBe("string");
    expect(Number(res.body.contract.amount)).toBe(1234.56);
  });
});

describe("GET /contracts", () => {
  it("filtra por status e por cliente", async () => {
    const { usuario, cliente } = await cenario();

    await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Ativo",
      amount: 100,
      status: "ACTIVE",
    });
    await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Concluido",
      amount: 200,
      status: "COMPLETED",
    });

    const concluidos = await usuario.get("/contracts?status=COMPLETED");
    const doCliente = await usuario.get(`/contracts?clientId=${cliente.id}`);

    expect(concluidos.body.contracts.every((c) => c.status === "COMPLETED")).toBe(true);
    expect(concluidos.body.contracts).toHaveLength(1);
    // O cenario ja cria um contrato, mais os dois daqui.
    expect(doCliente.body.contracts).toHaveLength(3);
  });

  it("traz quanto ja foi recebido em cada contrato", async () => {
    const { usuario, contrato } = await cenario({ amount: 1000 });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 300,
      dueDate: "2020-01-10",
      paidAt: "2020-01-10",
      method: "PIX",
    });

    const res = await usuario.get("/contracts");
    const encontrado = res.body.contracts.find((c) => c.id === contrato.id);

    expect(Number(encontrado.paidAmount)).toBe(300);
  });
});

describe("GET /contracts/stats", () => {
  it("conta e soma por status", async () => {
    const { usuario, cliente } = await cenario({ amount: 1000, status: "ACTIVE" });

    await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Outro ativo",
      amount: 500,
      status: "ACTIVE",
    });
    await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Cancelado",
      amount: 300,
      status: "CANCELLED",
    });

    const res = await usuario.get("/contracts/stats");
    const { stats } = res.body;

    expect(stats.totalClients).toBe(1);
    expect(stats.totalContracts).toBe(3);
    expect(stats.byStatus.ACTIVE.count).toBe(2);
    expect(Number(stats.byStatus.ACTIVE.total)).toBe(1500);
    expect(stats.byStatus.CANCELLED.count).toBe(1);
    // Status sem nenhum contrato precisa aparecer zerado, e nao
    // sumir: a tela le stats.byStatus.PENDING.count direto.
    expect(stats.byStatus.PENDING.count).toBe(0);
    expect(Number(stats.byStatus.PENDING.total)).toBe(0);
  });

  it("a rota /stats nao e confundida com um id", async () => {
    // "/stats" precisa ser declarada ANTES de "/:id" no Express,
    // senao "stats" casaria como se fosse o id de um contrato.
    const { usuario } = await cenario();

    const res = await usuario.get("/contracts/stats");

    expect(res.status).toBe(200);
    expect(res.body.stats).toBeDefined();
  });
});

describe("PUT e DELETE /contracts/:id", () => {
  it("atualiza status e valor", async () => {
    const { usuario, cliente, contrato } = await cenario({ amount: 1000 });

    const res = await usuario.put(`/contracts/${contrato.id}`, {
      clientId: cliente.id,
      title: "Contrato de Teste",
      amount: 2000,
      status: "COMPLETED",
    });

    expect(res.status).toBe(200);
    expect(Number(res.body.contract.amount)).toBe(2000);
    expect(res.body.contract.status).toBe("COMPLETED");
  });

  it("apagar o contrato apaga as parcelas", async () => {
    const { usuario, contrato } = await cenario();

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 300,
      dueDate: "2099-01-10",
      installments: 3,
    });

    await usuario.delete(`/contracts/${contrato.id}`);

    const sobraram = await prisma.payment.count({ where: { contractId: contrato.id } });
    expect(sobraram).toBe(0);
  });
});

describe("rotas inexistentes", () => {
  it("caminho desconhecido responde 404 em JSON", async () => {
    const usuario = await criarUsuario();
    usados.push(usuario);

    const res = await usuario.get("/nao-existe");

    expect(res.status).toBe(404);
    expect(res.body.error).toBeTruthy();
  });
});
