// ============================================================
// Relatorio de periodo
// ------------------------------------------------------------
// A parte delicada deste relatorio sao as DUAS janelas de tempo
// que convivem nele: o recebido olha a data do pagamento, o a
// receber e o atrasado olham o vencimento. Errar isso nao
// derruba a API - so devolve numero errado, que e pior.
//
// As datas dos testes sao calculadas a partir de hoje. Datas
// fixas fariam a suite passar hoje e quebrar sozinha em janeiro.
// ============================================================

import { describe, it, expect, afterEach } from "vitest";

import { criarCenario, apagarUsuarios, prisma } from "./helpers.js";

const usados = [];

async function cenario(opcoes) {
  const c = await criarCenario(opcoes);
  usados.push(c.usuario);
  return c;
}

afterEach(async () => {
  await apagarUsuarios(...usados.splice(0));
});

/** Data a N dias de hoje, no formato "AAAA-MM-DD". */
function dia(offset) {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

describe("periodo", () => {
  it("usa o mes corrente quando nada e informado", async () => {
    const { usuario } = await cenario();

    const res = await usuario.get("/reports");
    const hoje = new Date();

    expect(res.status).toBe(200);
    expect(res.body.report.period.from.slice(0, 7)).toBe(
      hoje.toISOString().slice(0, 7)
    );
  });

  it("aceita o periodo pedido", async () => {
    const { usuario } = await cenario();

    const res = await usuario.get("/reports?from=2026-03-01&to=2026-03-31");

    expect(res.body.report.period.from).toBe("2026-03-01");
    expect(res.body.report.period.to).toBe("2026-03-31");
  });

  it("corrige datas invertidas em vez de devolver tudo zerado", async () => {
    const { usuario } = await cenario();

    const res = await usuario.get("/reports?from=2026-12-31&to=2026-01-01");

    expect(res.body.report.period.swapped).toBe(true);
    expect(res.body.report.period.from).toBe("2026-01-01");
    expect(res.body.report.period.to).toBe("2026-12-31");
  });

  it("ignora data malformada e cai no periodo padrao", async () => {
    const { usuario } = await cenario();

    const res = await usuario.get("/reports?from=ontem&to=amanha");

    expect(res.status).toBe(200);
    expect(res.body.report.period.from).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("inclui o proprio dia final do periodo", async () => {
    // O limite superior precisa ser o FIM do dia. Com a
    // meia-noite, um pagamento do ultimo dia ficaria de fora.
    const { usuario, contrato } = await cenario();
    const hoje = dia(0);

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 500,
      dueDate: hoje,
      paidAt: hoje,
      method: "PIX",
    });

    const res = await usuario.get(`/reports?from=${hoje}&to=${hoje}`);

    expect(Number(res.body.report.totals.received.total)).toBe(500);
  });
});

describe("totais do periodo", () => {
  it("conta o recebido pela data do pagamento, nao pelo vencimento", async () => {
    // Parcela que venceu ha 40 dias e foi paga ontem: entra no
    // relatorio de agora, e nao no do vencimento.
    const { usuario, contrato } = await cenario({ amount: 1000 });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 800,
      dueDate: dia(-40),
      paidAt: dia(-1),
      method: "TRANSFER",
    });

    const recente = await usuario.get(`/reports?from=${dia(-7)}&to=${dia(0)}`);
    const antigo = await usuario.get(`/reports?from=${dia(-45)}&to=${dia(-35)}`);

    expect(Number(recente.body.report.totals.received.total)).toBe(800);
    expect(Number(antigo.body.report.totals.received.total)).toBe(0);
  });

  it("separa a receber de atrasado, sem contar duas vezes", async () => {
    const { usuario, contrato } = await cenario({ amount: 1000 });

    // Uma venceu ha 5 dias (atrasada), outra vence em 5 (a receber).
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 300,
      dueDate: dia(-5),
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 200,
      dueDate: dia(5),
    });

    const res = await usuario.get(`/reports?from=${dia(-30)}&to=${dia(30)}`);
    const { totals } = res.body.report;

    expect(Number(totals.overdue.total)).toBe(300);
    expect(Number(totals.pending.total)).toBe(200);
    // A prova que importa: nenhuma parcela entrou nos dois.
    expect(Number(totals.pending.total) + Number(totals.overdue.total)).toBe(500);
  });

  it("periodo inteiramente no futuro nao traz atrasado", async () => {
    const { usuario, contrato } = await cenario();

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 400,
      dueDate: dia(-10), // vencida, mas FORA do periodo pedido
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 600,
      dueDate: dia(40),
    });

    const res = await usuario.get(`/reports?from=${dia(30)}&to=${dia(60)}`);
    const { totals } = res.body.report;

    expect(Number(totals.overdue.total)).toBe(0);
    expect(Number(totals.pending.total)).toBe(600);
  });

  it("periodo inteiramente no passado nao traz a receber", async () => {
    const { usuario, contrato } = await cenario();

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 700,
      dueDate: dia(-20),
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 900,
      dueDate: dia(20), // futura, fora do periodo
    });

    const res = await usuario.get(`/reports?from=${dia(-40)}&to=${dia(-10)}`);
    const { totals } = res.body.report;

    expect(Number(totals.pending.total)).toBe(0);
    expect(Number(totals.overdue.total)).toBe(700);
  });
});

describe("agrupamento por cliente", () => {
  it("soma por cliente e ordena por quem mais pagou", async () => {
    const { usuario, cliente, contrato } = await cenario({ amount: 1000 });

    // Segundo cliente, com contrato proprio e valor maior.
    const outro = await usuario.post("/clients", { name: "Cliente Maior" });
    const contratoDoOutro = await usuario.post("/contracts", {
      clientId: outro.body.client.id,
      title: "Contrato Maior",
      amount: 5000,
    });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 200,
      dueDate: dia(-3),
      paidAt: dia(-3),
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: contratoDoOutro.body.contract.id,
      amount: 1500,
      dueDate: dia(-2),
      paidAt: dia(-2),
      method: "BOLETO",
    });

    const res = await usuario.get(`/reports?from=${dia(-10)}&to=${dia(0)}`);
    const { byClient } = res.body.report;

    expect(byClient).toHaveLength(2);
    expect(byClient[0].name).toBe("Cliente Maior");
    expect(Number(byClient[0].received)).toBe(1500);
    expect(byClient[1].id).toBe(cliente.id);
    expect(Number(byClient[1].received)).toBe(200);
  });

  it("a soma por cliente bate com o total do periodo", async () => {
    const { usuario, contrato } = await cenario({ amount: 2000 });

    for (const valor of [100.55, 200.45, 33.33]) {
      await usuario.post("/payments", {
        contractId: contrato.id,
        amount: valor,
        dueDate: dia(-1),
        paidAt: dia(-1),
        method: "PIX",
      });
    }

    const res = await usuario.get(`/reports?from=${dia(-5)}&to=${dia(0)}`);
    const { byClient, totals } = res.body.report;

    const somaDosClientes = byClient.reduce(
      (acc, c) => acc + Math.round(Number(c.received) * 100),
      0
    );

    expect(somaDosClientes).toBe(Math.round(Number(totals.received.total) * 100));
    expect(somaDosClientes).toBe(33433);
  });

  it("conta quantos contratos do cliente entraram no periodo", async () => {
    const { usuario, cliente, contrato } = await cenario();

    const segundo = await usuario.post("/contracts", {
      clientId: cliente.id,
      title: "Segundo contrato",
      amount: 500,
    });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 100,
      dueDate: dia(-1),
      paidAt: dia(-1),
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: segundo.body.contract.id,
      amount: 100,
      dueDate: dia(-1),
      paidAt: dia(-1),
      method: "PIX",
    });

    const res = await usuario.get(`/reports?from=${dia(-5)}&to=${dia(0)}`);

    expect(res.body.report.byClient[0].contracts).toBe(2);
  });
});

describe("formas de recebimento", () => {
  it("agrupa por forma e so conta o que ja entrou", async () => {
    const { usuario, contrato } = await cenario({ amount: 3000 });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 500,
      dueDate: dia(-2),
      paidAt: dia(-2),
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 300,
      dueDate: dia(-1),
      paidAt: dia(-1),
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 900,
      dueDate: dia(-1),
      paidAt: dia(-1),
      method: "BOLETO",
    });
    // Em aberto: nao tem forma de pagamento ainda.
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 1000,
      dueDate: dia(5),
    });

    const res = await usuario.get(`/reports?from=${dia(-10)}&to=${dia(0)}`);
    const { byMethod } = res.body.report;

    // Ordenado pelo maior valor: BOLETO 900 antes de PIX 800.
    expect(byMethod[0].method).toBe("BOLETO");
    expect(Number(byMethod[0].total)).toBe(900);
    expect(byMethod[1].method).toBe("PIX");
    expect(Number(byMethod[1].total)).toBe(800);
    expect(byMethod[1].count).toBe(2);
    // Formas sem nenhum recebimento nao aparecem na lista.
    expect(byMethod).toHaveLength(2);
  });

  it("a soma das formas bate com o total recebido", async () => {
    const { usuario, contrato } = await cenario({ amount: 3000 });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 250,
      dueDate: dia(-1),
      paidAt: dia(-1),
      method: "CARD",
    });
    // Recebida SEM forma anotada: precisa cair em algum balde,
    // senao a soma das formas ficaria menor que o total.
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 150,
      dueDate: dia(-1),
      paidAt: dia(-1),
    });

    const res = await usuario.get(`/reports?from=${dia(-5)}&to=${dia(0)}`);
    const { byMethod, totals } = res.body.report;

    const soma = byMethod.reduce((acc, m) => acc + Math.round(Number(m.total) * 100), 0);

    expect(soma).toBe(Math.round(Number(totals.received.total) * 100));
    expect(soma).toBe(40000);
  });
});

describe("recebido mes a mes", () => {
  it("agrupa por mes dentro do periodo", async () => {
    const { usuario, contrato } = await cenario({ amount: 5000 });

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 1000,
      dueDate: "2026-03-10",
      paidAt: "2026-03-10",
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 500,
      dueDate: "2026-03-20",
      paidAt: "2026-03-20",
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 700,
      dueDate: "2026-04-05",
      paidAt: "2026-04-05",
      method: "PIX",
    });

    const res = await usuario.get("/reports?from=2026-03-01&to=2026-04-30");
    const { monthly } = res.body.report;

    expect(monthly).toHaveLength(2);
    expect(monthly[0]).toMatchObject({ key: "2026-03" });
    expect(Number(monthly[0].total)).toBe(1500);
    expect(monthly[1].key).toBe("2026-04");
    expect(Number(monthly[1].total)).toBe(700);
  });
});

describe("isolamento", () => {
  it("o relatorio nao mistura dados de outro usuario", async () => {
    const primeiro = await cenario({ amount: 1000 });
    const segundo = await cenario({ amount: 1000 });

    await primeiro.usuario.post("/payments", {
      contractId: primeiro.contrato.id,
      amount: 999,
      dueDate: dia(-1),
      paidAt: dia(-1),
      method: "PIX",
    });

    const res = await segundo.usuario.get(`/reports?from=${dia(-10)}&to=${dia(0)}`);

    expect(Number(res.body.report.totals.received.total)).toBe(0);
    expect(res.body.report.byClient).toHaveLength(0);
  });

  it("exige autenticacao", async () => {
    const { request, app } = await import("./helpers.js");
    const res = await request(app).get("/reports");

    expect(res.status).toBe(401);
  });
});
