// ============================================================
// Cadastro, login e sessao
// ------------------------------------------------------------
// Alem do caminho feliz, este arquivo cobra as decisoes de
// seguranca que o README promete: a senha nunca sai do backend
// e o login nao revela quais e-mails existem.
// ============================================================

import { describe, it, expect, afterAll } from "vitest";

import { app, request, criarUsuario, emailUnico, apagarUsuarios, prisma } from "./helpers.js";

// Contas criadas ao longo do arquivo, apagadas no final.
const criadas = [];

afterAll(async () => {
  await apagarUsuarios(...criadas);
  await prisma.$disconnect();
});

describe("POST /auth/register", () => {
  it("cria a conta e ja devolve um token", async () => {
    const email = emailUnico();

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Maria Souza", email, password: "senha-forte-123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe(email);

    criadas.push({ id: res.body.user.id });
  });

  it("nunca devolve o hash da senha", async () => {
    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Joao Lima", email: emailUnico(), password: "senha-forte-123" });

    criadas.push({ id: res.body.user.id });

    // Nem com o nome do campo do banco, nem com o do JSON.
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.user).not.toHaveProperty("password_hash");
    expect(JSON.stringify(res.body)).not.toContain("$2");
  });

  it("guarda a senha com hash, nunca em texto puro", async () => {
    const senha = "senha-forte-123";
    const email = emailUnico();

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Ana Dias", email, password: senha });

    criadas.push({ id: res.body.user.id });

    const noBanco = await prisma.user.findUnique({
      where: { email },
      select: { passwordHash: true },
    });

    expect(noBanco.passwordHash).not.toBe(senha);
    // Prefixo do bcrypt - prova que passou pelo algoritmo.
    expect(noBanco.passwordHash.startsWith("$2")).toBe(true);
  });

  it("recusa e-mail repetido", async () => {
    const usuario = await criarUsuario();
    criadas.push(usuario);

    const res = await request(app)
      .post("/auth/register")
      .send({ name: "Clone", email: usuario.email, password: "outra-senha-123" });

    expect(res.status).toBe(409);
  });

  it("recusa e-mail invalido e senha curta", async () => {
    const semEmail = await request(app)
      .post("/auth/register")
      .send({ name: "Teste", email: "nao-e-email", password: "senha-forte-123" });

    const senhaCurta = await request(app)
      .post("/auth/register")
      .send({ name: "Teste", email: emailUnico(), password: "123" });

    expect(semEmail.status).toBe(400);
    expect(senhaCurta.status).toBe(400);
  });
});

describe("POST /auth/login", () => {
  it("entra com a senha certa", async () => {
    const usuario = await criarUsuario();
    criadas.push(usuario);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: usuario.email, password: usuario.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("recusa a senha errada", async () => {
    const usuario = await criarUsuario();
    criadas.push(usuario);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: usuario.email, password: "senha-errada-123" });

    expect(res.status).toBe(401);
  });

  it("responde igual para senha errada e para e-mail que nao existe", async () => {
    // Se as respostas fossem diferentes, daria para descobrir
    // quais e-mails estao cadastrados so testando um por um.
    const usuario = await criarUsuario();
    criadas.push(usuario);

    const senhaErrada = await request(app)
      .post("/auth/login")
      .send({ email: usuario.email, password: "senha-errada-123" });

    const emailInexistente = await request(app)
      .post("/auth/login")
      .send({ email: emailUnico(), password: "senha-errada-123" });

    expect(senhaErrada.status).toBe(emailInexistente.status);
    expect(senhaErrada.body.error).toBe(emailInexistente.body.error);
  });
});

describe("GET /auth/me", () => {
  it("devolve os dados de quem esta com o token", async () => {
    const usuario = await criarUsuario("Carla Nunes");
    criadas.push(usuario);

    const res = await usuario.get("/auth/me");

    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe("Carla Nunes");
    expect(res.body.user).not.toHaveProperty("passwordHash");
  });

  it("barra quem nao mandou token", async () => {
    const res = await request(app).get("/auth/me");
    expect(res.status).toBe(401);
  });

  it("barra token adulterado", async () => {
    const usuario = await criarUsuario();
    criadas.push(usuario);

    // Troca o ultimo caractere: a assinatura deixa de bater.
    const adulterado = usuario.token.slice(0, -1) + (usuario.token.endsWith("a") ? "b" : "a");

    const res = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${adulterado}`);

    expect(res.status).toBe(401);
  });
});
