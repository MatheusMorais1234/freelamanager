// ============================================================
// Parcelas: divisao do valor, vencimentos e baixa
// ------------------------------------------------------------
// Aqui moram as duas contas que o README promete acertar:
//   1. parcelar sem perder centavo;
//   2. vencimento mensal que respeita o fim do mes.
// Ambas sao daquelas que "funcionam" nos numeros redondos do
// teste manual e quebram justamente no caso torto.
// ============================================================

import { describe, it, expect, afterEach } from "vitest";

import { criarCenario, apagarUsuarios, prisma } from "./helpers.js";

// Cada teste cria o proprio cenario; guardamos para limpar.
const usados = [];

async function cenario(opcoes) {
  const c = await criarCenario(opcoes);
  usados.push(c.usuario);
  return c;
}

afterEach(async () => {
  await apagarUsuarios(...usados.splice(0));
});

/** Soma os valores das parcelas com precisao de centavo. */
function somaEmCentavos(parcelas) {
  return parcelas.reduce((total, p) => total + Math.round(Number(p.amount) * 100), 0);
}

describe("divisao do valor em parcelas", () => {
  it("divide certinho quando o valor e redondo", async () => {
    const { usuario, contrato } = await cenario({ amount: 900 });

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 900,
      dueDate: "2026-01-10",
      installments: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.payments).toHaveLength(3);
    expect(res.body.payments.map((p) => Number(p.amount))).toEqual([300, 300, 300]);
  });

  it("nao perde centavo quando a divisao nao e exata", async () => {
    // 10.000,01 em 3x. Dividir em ponto flutuante daria
    // 3.333,336... e arredondar cada parcela faria a soma
    // fechar em 10.000,02 ou 10.000,00 - nunca no total.
    const { usuario, contrato } = await cenario({ amount: 10000.01 });

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 10000.01,
      dueDate: "2026-01-10",
      installments: 3,
    });

    const valores = res.body.payments.map((p) => Number(p.amount));

    expect(valores).toEqual([3333.35, 3333.33, 3333.33]);
    // A prova que importa: a soma bate com o total, ao centavo.
    expect(somaEmCentavos(res.body.payments)).toBe(1000001);
  });

  it("joga a sobra na primeira parcela, nao na ultima", async () => {
    // A sobra na primeira e proposital: o freelancer recebe o
    // centavo a mais na entrada, e nao meses depois.
    const { usuario, contrato } = await cenario({ amount: 100 });

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: "2026-01-10",
      installments: 3,
    });

    const valores = res.body.payments.map((p) => Number(p.amount));

    expect(valores[0]).toBeGreaterThan(valores[1]);
    expect(valores).toEqual([33.34, 33.33, 33.33]);
    expect(somaEmCentavos(res.body.payments)).toBe(10000);
  });

  it("fecha a soma em varios parcelamentos dificeis", async () => {
    const casos = [
      { total: 0.03, partes: 2 },
      { total: 999.99, partes: 7 },
      { total: 1234.56, partes: 12 },
      { total: 50000, partes: 60 },
    ];

    for (const { total, partes } of casos) {
      const { usuario, contrato } = await cenario({ amount: total });

      const res = await usuario.post("/payments", {
        contractId: contrato.id,
        amount: total,
        dueDate: "2026-01-15",
        installments: partes,
      });

      expect(res.body.payments).toHaveLength(partes);
      expect(somaEmCentavos(res.body.payments)).toBe(Math.round(total * 100));
    }
  });

  it("recusa mais de 60 parcelas", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 1000,
      dueDate: "2026-01-10",
      installments: 61,
    });

    expect(res.status).toBe(400);
  });
});

describe("vencimentos mensais", () => {
  it("anda de mes em mes", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 300,
      dueDate: "2026-01-10",
      installments: 3,
    });

    const datas = res.body.payments.map((p) => p.dueDate.slice(0, 10));
    expect(datas).toEqual(["2026-01-10", "2026-02-10", "2026-03-10"]);
  });

  it("dia 31 cai no ultimo dia do mes curto e volta depois", async () => {
    // Somar 30 dias faria a data escorregar todo mes: 31/01
    // viraria 02/03, depois 01/04... Aqui ela volta para 31.
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 400,
      dueDate: "2026-01-31",
      installments: 4,
    });

    const datas = res.body.payments.map((p) => p.dueDate.slice(0, 10));
    expect(datas).toEqual(["2026-01-31", "2026-02-28", "2026-03-31", "2026-04-30"]);
  });

  it("respeita o 29 de fevereiro de ano bissexto", async () => {
    // 2028 e bissexto: 31/01/2028 + 1 mes = 29/02, nao 28/02.
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 200,
      dueDate: "2028-01-31",
      installments: 2,
    });

    const datas = res.body.payments.map((p) => p.dueDate.slice(0, 10));
    expect(datas).toEqual(["2028-01-31", "2028-02-29"]);
  });

  it("atravessa a virada do ano", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 300,
      dueDate: "2026-11-15",
      installments: 3,
    });

    const datas = res.body.payments.map((p) => p.dueDate.slice(0, 10));
    expect(datas).toEqual(["2026-11-15", "2026-12-15", "2027-01-15"]);
  });
});

describe("numeracao das parcelas", () => {
  it("numera quando ha mais de uma", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 600,
      dueDate: "2026-01-10",
      installments: 2,
      description: "Projeto",
    });

    const nomes = res.body.payments.map((p) => p.description);
    expect(nomes).toEqual(["Projeto 1/2", "Projeto 2/2"]);
  });

  it("nao numera parcela unica - 'Parcela 1/1' seria ruido", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 600,
      dueDate: "2026-01-10",
      description: "Pagamento único",
    });

    expect(res.body.payments[0].description).toBe("Pagamento único");
  });
});

describe("status derivado da data", () => {
  it("parcela futura e sem pagamento fica PENDING", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: "2099-01-10",
    });

    expect(res.body.payments[0].status).toBe("PENDING");
  });

  it("parcela vencida e sem pagamento fica OVERDUE", async () => {
    // O status nao esta gravado em coluna nenhuma: ele nasce da
    // comparacao do vencimento com hoje, a cada leitura.
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: "2020-01-10",
    });

    expect(res.body.payments[0].status).toBe("OVERDUE");
  });

  it("parcela vencida mas paga fica PAID, nao OVERDUE", async () => {
    const { usuario, contrato } = await cenario();

    const res = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: "2020-01-10",
      paidAt: "2020-01-09",
      method: "PIX",
    });

    expect(res.body.payments[0].status).toBe("PAID");
  });
});

describe("baixa do recebimento", () => {
  it("marca como recebida e desfaz", async () => {
    const { usuario, contrato } = await cenario();

    const criada = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: "2099-01-10",
    });
    const id = criada.body.payments[0].id;

    const baixa = await usuario.patch(`/payments/${id}/settle`, {
      paid: true,
      method: "PIX",
    });

    expect(baixa.status).toBe(200);
    expect(baixa.body.payment.status).toBe("PAID");
    expect(baixa.body.payment.paidAt).not.toBeNull();

    const desfeita = await usuario.patch(`/payments/${id}/settle`, { paid: false });

    expect(desfeita.body.payment.status).toBe("PENDING");
    // Desfazer limpa a data: sem isso sobraria "pago" sem
    // pagamento, exatamente a inconsistencia que o status
    // derivado existe para evitar.
    expect(desfeita.body.payment.paidAt).toBeNull();
  });

  it("a baixa entra no resumo do faturamento", async () => {
    const { usuario, contrato } = await cenario();

    const criada = await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 250,
      dueDate: "2099-01-10",
    });

    const antes = await usuario.get("/payments/summary");
    expect(Number(antes.body.summary.paid.total)).toBe(0);
    expect(Number(antes.body.summary.pending.total)).toBe(250);

    await usuario.patch(`/payments/${criada.body.payments[0].id}/settle`, { paid: true });

    const depois = await usuario.get("/payments/summary");
    expect(Number(depois.body.summary.paid.total)).toBe(250);
    expect(Number(depois.body.summary.pending.total)).toBe(0);
  });
});

describe("apagar o contrato leva as parcelas junto", () => {
  it("parcela sem contrato nao pode sobrar no banco", async () => {
    const { usuario, contrato } = await cenario();

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 500,
      dueDate: "2099-01-10",
      installments: 5,
    });

    const antes = await prisma.payment.count({ where: { contractId: contrato.id } });
    expect(antes).toBe(5);

    await usuario.delete(`/contracts/${contrato.id}`);

    const depois = await prisma.payment.count({ where: { contractId: contrato.id } });
    expect(depois).toBe(0);
  });
});
