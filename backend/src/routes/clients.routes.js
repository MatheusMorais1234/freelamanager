// ============================================================
// Rotas de clientes (CRUD) - todas protegidas
//   GET    /clients      lista
//   POST   /clients      cria
//   GET    /clients/:id  detalhe
//   PUT    /clients/:id  atualiza
//   DELETE /clients/:id  remove
// ------------------------------------------------------------
// REGRA DE OURO: toda consulta filtra por userId. E isso que
// impede um usuario de ver ou mexer no cliente de outro.
// ============================================================

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { onlyDigits, isValidDocument } from "../lib/document.js";
import { startOfToday } from "../lib/payment-status.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Aplica autenticacao a TODAS as rotas deste arquivo de uma vez.
router.use(authenticate);

// Siglas das 27 unidades federativas - lista fechada evita "SPP".
const UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

// Campo de texto opcional: aceita ausencia ou string vazia.
const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(""));

const clientSchema = z
  .object({
    type: z.enum(["PERSON", "COMPANY"]).default("PERSON"),

    // Identificacao
    name: z.string().trim().min(2, "Nome muito curto").max(120),
    company: optionalText(120),
    document: optionalText(18),
    stateRegistration: optionalText(20),
    birthDate: z.coerce.date().optional().nullable().or(z.literal("")),

    // Contato
    email: z.email("E-mail invalido").optional().or(z.literal("")),
    phone: optionalText(20),
    mobile: optionalText(20),
    website: optionalText(180),

    // Endereco
    zipCode: optionalText(9),
    street: optionalText(160),
    number: optionalText(20),
    complement: optionalText(80),
    district: optionalText(80),
    city: optionalText(80),
    state: z.enum(UF).optional().or(z.literal("")),

    notes: optionalText(2000),
  })
  // O documento so pode ser conferido DEPOIS de saber o tipo,
  // por isso a checagem fica aqui e nao no campo isolado.
  .refine((data) => isValidDocument(data.document, data.type), {
    message: "Documento invalido para o tipo escolhido",
    path: ["document"],
  })
  .refine((data) => !(data.zipCode && onlyDigits(data.zipCode).length !== 8), {
    message: "CEP deve ter 8 digitos",
    path: ["zipCode"],
  });

// Converte "" em null, para o banco guardar ausencia de verdade
// em vez de string vazia. Documento e CEP sao gravados apenas
// com digitos, para nao duplicar cadastro por causa da mascara.
function normalize(data) {
  const text = (v) => (v ? String(v).trim() : null);
  const digits = (v) => (onlyDigits(v) ? onlyDigits(v) : null);

  return {
    type: data.type || "PERSON",

    name: data.name.trim(),
    company: text(data.company),
    document: digits(data.document),
    stateRegistration: text(data.stateRegistration),
    birthDate: data.birthDate ? new Date(data.birthDate) : null,

    email: text(data.email),
    // Telefone entra so com digitos, igual ao documento e ao
    // CEP: a mascara e coisa de tela. Gravar "(11) 98765-4321"
    // faria o mesmo numero digitado de outro jeito virar outro
    // valor, e a busca teria que adivinhar a pontuacao.
    phone: digits(data.phone),
    mobile: digits(data.mobile),
    website: text(data.website),

    zipCode: digits(data.zipCode),
    street: text(data.street),
    number: text(data.number),
    complement: text(data.complement),
    district: text(data.district),
    city: text(data.city),
    state: text(data.state),

    notes: text(data.notes),
  };
}

// O indice unico (userId + document) faz o Postgres recusar um
// CPF/CNPJ repetido. O Prisma sinaliza isso com o codigo P2002 -
// traduzimos para uma mensagem que o formulario sabe exibir.
function handleDuplicate(err, res, next) {
  if (err?.code === "P2002") {
    return res.status(409).json({
      error: "Ja existe um cliente com este CPF/CNPJ",
      fields: { document: "Documento ja cadastrado" },
    });
  }
  return next(err);
}

/**
 * Situacao financeira de UM cliente, somada no banco.
 *
 * Sao duas consultas fixas, nao uma por contrato: um groupBy
 * por contrato (para a coluna "recebido" de cada linha) e um
 * agrupamento por situacao da parcela (para os totais do topo).
 * Percorrer os contratos perguntando o total de cada um seria o
 * problema do "N+1" - 20 contratos, 21 idas ao banco.
 *
 * "Atrasado" nasce da comparacao com hoje, nao de uma coluna:
 * a mesma regra derivada usada no resto do sistema.
 */
async function financeiroDoCliente(userId, contractIds) {
  if (contractIds.length === 0) {
    return {
      paidByContract: new Map(),
      summary: { paid: "0", pending: "0", overdue: "0" },
    };
  }

  const doCliente = { userId, contractId: { in: contractIds } };

  // Hoje a zero hora UTC: uma parcela que vence HOJE ainda nao
  // esta atrasada, so amanha.
  //
  // Vem de payment-status.js de proposito, e nao de um
  // setHours(0,0,0,0) local. As datas sao gravadas como @db.Date,
  // ou seja, meia-noite UTC. Em UTC-3, a meia-noite LOCAL de hoje
  // e 03:00Z - depois do vencimento de hoje. A parcela que vence
  // hoje cairia em "atrasado" aqui e em "a receber" no resto do
  // sistema: o mesmo numero, vermelho nesta tela e normal na
  // outra. A regra do que e "hoje" precisa morar em um lugar so.
  const hoje = startOfToday();

  const [porContrato, recebido, aVencer, atrasado] = await Promise.all([
    prisma.payment.groupBy({
      by: ["contractId"],
      where: { ...doCliente, paidAt: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...doCliente, paidAt: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...doCliente, paidAt: null, dueDate: { gte: hoje } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...doCliente, paidAt: null, dueDate: { lt: hoje } },
      _sum: { amount: true },
    }),
  ]);

  return {
    paidByContract: new Map(
      porContrato.map((r) => [r.contractId, (r._sum.amount ?? 0).toString()])
    ),
    // Valores viajam como string, igual ao resto da API: o
    // Decimal do banco nao cabe em ponto flutuante sem perder
    // centavos.
    summary: {
      paid: (recebido._sum.amount ?? 0).toString(),
      pending: (aVencer._sum.amount ?? 0).toString(),
      overdue: (atrasado._sum.amount ?? 0).toString(),
    },
  };
}

// ------------------------------------------------------------
// GET /clients
// ------------------------------------------------------------
router.get("/", async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      // _count traz quantos contratos cada cliente tem,
      // sem precisar carregar os contratos inteiros.
      include: { _count: { select: { contracts: true } } },
    });

    return res.json({ clients });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /clients
// ------------------------------------------------------------
router.post("/", validate(clientSchema), async (req, res, next) => {
  try {
    const client = await prisma.client.create({
      // O userId vem do TOKEN, nunca do corpo da requisicao.
      // Se viesse do body, o usuario poderia criar clientes
      // em nome de outra pessoa.
      data: { ...normalize(req.body), userId: req.userId },
    });

    return res.status(201).json({ client });
  } catch (err) {
    return handleDuplicate(err, res, next);
  }
});

// ------------------------------------------------------------
// GET /clients/:id
// ------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      // findFirst com os dois filtros (e nao findUnique so por id)
      // porque precisamos exigir que o cliente seja DESTE usuario.
      where: { id: req.params.id, userId: req.userId },
      include: { contracts: { orderBy: { createdAt: "desc" } } },
    });

    if (!client) return res.status(404).json({ error: "Cliente nao encontrado" });

    // Quanto ja entrou por contrato e o resumo do cliente.
    const { paidByContract, summary } = await financeiroDoCliente(
      req.userId,
      client.contracts.map((c) => c.id)
    );

    return res.json({
      client: {
        ...client,
        contracts: client.contracts.map((c) => ({
          ...c,
          paid: paidByContract.get(c.id) ?? "0",
        })),
      },
      summary,
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// PUT /clients/:id
// ------------------------------------------------------------
router.put("/:id", validate(clientSchema), async (req, res, next) => {
  try {
    // updateMany aceita filtro composto e retorna quantas linhas
    // mudaram - se for 0, ou nao existe ou nao e do usuario.
    const result = await prisma.client.updateMany({
      where: { id: req.params.id, userId: req.userId },
      data: normalize(req.body),
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    return res.json({ client });
  } catch (err) {
    return handleDuplicate(err, res, next);
  }
});

// ------------------------------------------------------------
// DELETE /clients/:id
// ------------------------------------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    // Os contratos do cliente somem junto (onDelete: Cascade).
    const result = await prisma.client.deleteMany({
      where: { id: req.params.id, userId: req.userId },
    });

    if (result.count === 0) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    return res.status(204).send(); // 204 = deu certo, sem conteudo
  } catch (err) {
    next(err);
  }
});

export default router;
