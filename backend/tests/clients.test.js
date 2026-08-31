// ============================================================
// Clientes: cadastro, normalizacao e a ficha do cliente
// ------------------------------------------------------------
// Duas regras do README ganham teste aqui:
//   - documento, telefone e CEP entram no banco SO COM DIGITOS
//     (a mascara e coisa de tela);
//   - o mesmo CPF nao se repete para um freelancer, mas dois
//     freelancers podem atender o mesmo cliente.
// ============================================================

import { describe, it, expect, afterEach } from "vitest";

import { criarUsuario, criarCenario, apagarUsuarios, prisma } from "./helpers.js";

const usados = [];

async function novoUsuario() {
  const u = await criarUsuario();
  usados.push(u);
  return u;
}

afterEach(async () => {
  await apagarUsuarios(...usados.splice(0));
});

describe("POST /clients", () => {
  it("cria com o minimo: so o nome", async () => {
    const usuario = await novoUsuario();

    const res = await usuario.post("/clients", { name: "Cliente Enxuto" });

    expect(res.status).toBe(201);
    expect(res.body.client.name).toBe("Cliente Enxuto");
    expect(res.body.client.type).toBe("PERSON");
  });

  it("recusa nome vazio ou curto demais", async () => {
    const usuario = await novoUsuario();

    expect((await usuario.post("/clients", { name: "" })).status).toBe(400);
    expect((await usuario.post("/clients", { name: "A" })).status).toBe(400);
  });

  it("grava documento, telefone e CEP so com digitos", async () => {
    // Sem isso, "123.456.789-05" e "12345678905" virariam dois
    // cadastros diferentes e a busca teria que adivinhar a
    // pontuacao usada no dia do cadastro.
    const usuario = await novoUsuario();

    const res = await usuario.post("/clients", {
      name: "Camila Ferraz",
      document: "390.533.447-05",
      phone: "(11) 3214-5678",
      mobile: "(11) 98765-4321",
      zipCode: "01310-100",
    });

    expect(res.status).toBe(201);
    expect(res.body.client.document).toBe("39053344705");
    expect(res.body.client.phone).toBe("1132145678");
    expect(res.body.client.mobile).toBe("11987654321");
    expect(res.body.client.zipCode).toBe("01310100");
  });

  it("recusa CPF com digito verificador errado", async () => {
    const usuario = await novoUsuario();

    const res = await usuario.post("/clients", {
      name: "Documento Torto",
      document: "390.533.447-06",
    });

    expect(res.status).toBe(400);
  });

  it("recusa CNPJ no cadastro de pessoa fisica", async () => {
    const usuario = await novoUsuario();

    const res = await usuario.post("/clients", {
      name: "Tipo Trocado",
      type: "PERSON",
      document: "19131243000197",
    });

    expect(res.status).toBe(400);
  });

  it("aceita CNPJ valido para empresa", async () => {
    const usuario = await novoUsuario();

    const res = await usuario.post("/clients", {
      name: "Padaria Aurora Ltda",
      type: "COMPANY",
      document: "19.131.243/0001-97",
    });

    expect(res.status).toBe(201);
    expect(res.body.client.document).toBe("19131243000197");
  });

  it("recusa UF que nao existe", async () => {
    const usuario = await novoUsuario();

    const res = await usuario.post("/clients", { name: "Endereco Torto", state: "SPP" });

    expect(res.status).toBe(400);
  });
});

describe("unicidade do documento", () => {
  it("o mesmo CPF nao se repete para o mesmo freelancer", async () => {
    const usuario = await novoUsuario();

    await usuario.post("/clients", { name: "Primeiro", document: "39053344705" });
    const repetido = await usuario.post("/clients", {
      name: "Segundo",
      document: "390.533.447-05",
    });

    expect(repetido.status).toBe(409);
    // A mensagem aponta o campo, para o formulario marcar onde.
    expect(repetido.body.fields?.document).toBeTruthy();
  });

  it("mas dois freelancers podem ter o mesmo cliente", async () => {
    // A unicidade e composta (userId + documento). Se fosse so
    // pelo documento, o cadastro de um usuario impediria o do
    // outro - e clientes sao compartilhados no mundo real.
    const primeiro = await novoUsuario();
    const segundo = await novoUsuario();

    const a = await primeiro.post("/clients", { name: "Cliente", document: "39053344705" });
    const b = await segundo.post("/clients", { name: "Cliente", document: "39053344705" });

    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
  });
});

describe("PUT e DELETE /clients/:id", () => {
  it("atualiza o cadastro", async () => {
    const usuario = await novoUsuario();
    const criado = await usuario.post("/clients", { name: "Nome Antigo" });

    const res = await usuario.put(`/clients/${criado.body.client.id}`, {
      name: "Nome Novo",
      city: "Curitiba",
      state: "PR",
    });

    expect(res.status).toBe(200);
    expect(res.body.client.name).toBe("Nome Novo");
    expect(res.body.client.city).toBe("Curitiba");
  });

  it("apagar o cliente leva os contratos junto", async () => {
    const { usuario, cliente, contrato } = await criarCenario();
    usados.push(usuario);

    await usuario.delete(`/clients/${cliente.id}`);

    const sobrou = await prisma.contract.count({ where: { id: contrato.id } });
    expect(sobrou).toBe(0);
  });
});

describe("GET /clients/:id - a ficha do cliente", () => {
  it("traz os contratos e os totais somados", async () => {
    const { usuario, cliente, contrato } = await criarCenario({ amount: 1000 });
    usados.push(usuario);

    // Duas parcelas: uma ja recebida, outra vencida em aberto.
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 400,
      dueDate: "2020-01-10",
      paidAt: "2020-01-10",
      method: "PIX",
    });
    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 600,
      dueDate: "2020-02-10",
    });

    const res = await usuario.get(`/clients/${cliente.id}`);

    expect(res.status).toBe(200);
    expect(res.body.client.contracts).toHaveLength(1);
    // Quanto ja entrou naquele contrato, somado no banco.
    expect(Number(res.body.client.contracts[0].paid)).toBe(400);

    expect(Number(res.body.summary.paid)).toBe(400);
    expect(Number(res.body.summary.overdue)).toBe(600);
    expect(Number(res.body.summary.pending)).toBe(0);
  });

  it("separa o que ainda vai vencer do que ja venceu", async () => {
    const { usuario, cliente, contrato } = await criarCenario({ amount: 1000 });
    usados.push(usuario);

    await usuario.post("/payments", {
      contractId: contrato.id,
      amount: 700,
      dueDate: "2099-01-10",
    });

    const res = await usuario.get(`/clients/${cliente.id}`);

    expect(Number(res.body.summary.pending)).toBe(700);
    expect(Number(res.body.summary.overdue)).toBe(0);
  });

  it("cliente sem contrato devolve zeros, nao quebra", async () => {
    const usuario = await novoUsuario();
    const criado = await usuario.post("/clients", { name: "Sem Contrato" });

    const res = await usuario.get(`/clients/${criado.body.client.id}`);

    expect(res.status).toBe(200);
    expect(res.body.client.contracts).toHaveLength(0);
    expect(Number(res.body.summary.paid)).toBe(0);
    expect(Number(res.body.summary.pending)).toBe(0);
    expect(Number(res.body.summary.overdue)).toBe(0);
  });

  it("id que nao existe responde 404", async () => {
    const usuario = await novoUsuario();

    const res = await usuario.get("/clients/00000000-0000-0000-0000-000000000000");

    expect(res.status).toBe(404);
  });
});
