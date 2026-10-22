// CRUD de clientes. Toda query filtra por userId.

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { onlyDigits, isValidDocument } from "../lib/document.js";
import { startOfToday, paymentWhere } from "../lib/payment-status.js";
import { money } from "../lib/money.js";
import { updateOwned, deleteOwned } from "../lib/ownership.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

router.use(authenticate);

const UF = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
  "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
  "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const optionalText = (max) => z.string().trim().max(max).optional().or(z.literal(""));

// Completa "exemplo.com.br" com https:// (senao vira link relativo)
// e barra qualquer coisa que nao seja http/https, tipo javascript:.
// Retorna null se for invalido.
function normalizeWebsite(value) {
  const raw = String(value).trim();

  // sem ponto na classe, senao "site.com:8080" passa como esquema
  const temEsquema = /^[a-zA-Z][a-zA-Z0-9+-]*:/.test(raw);
  const completo = temEsquema ? raw : `https://${raw}`;

  let url;
  try {
    url = new URL(completo);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // nao usa url.href pra nao ganhar "/" no final
  return completo;
}

const websiteField = optionalText(180)
  .transform((v) => (v ? normalizeWebsite(v) : v))
  .refine((v) => v !== null, { error: "Endereco de site invalido" });

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
    website: websiteField,

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
  // depende do type, por isso fica no objeto
  .refine((data) => isValidDocument(data.document, data.type), {
    message: "Documento invalido para o tipo escolhido",
    path: ["document"],
  })
  .refine((data) => !(data.zipCode && onlyDigits(data.zipCode).length !== 8), {
    message: "CEP deve ter 8 digitos",
    path: ["zipCode"],
  });

// "" vira null; documento, CEP e telefones vao so com digitos
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

// P2002 = violou o unique (userId, document)
function handleDuplicate(err, res, next) {
  if (err?.code === "P2002") {
    return res.status(409).json({
      error: "Ja existe um cliente com este CPF/CNPJ",
      fields: { document: "Documento ja cadastrado" },
    });
  }
  return next(err);
}

// Totais do cliente direto no banco (groupBy + aggregate, sem N+1).
async function financeiroDoCliente(userId, contractIds) {
  if (contractIds.length === 0) {
    return {
      paidByContract: new Map(),
      summary: { paid: "0", pending: "0", overdue: "0" },
    };
  }

  const doCliente = { userId, contractId: { in: contractIds } };

  // meia-noite UTC, nao local (vencimento e @db.Date). Ver payment-status.js
  const hoje = startOfToday();

  const [porContrato, recebido, aVencer, atrasado] = await Promise.all([
    prisma.payment.groupBy({
      by: ["contractId"],
      where: { ...doCliente, paidAt: { not: null } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...doCliente, ...paymentWhere("PAID", hoje) },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...doCliente, ...paymentWhere("PENDING", hoje) },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { ...doCliente, ...paymentWhere("OVERDUE", hoje) },
      _sum: { amount: true },
    }),
  ]);

  return {
    paidByContract: new Map(
      porContrato.map((r) => [r.contractId, money(r._sum.amount)])
    ),
    summary: {
      paid: money(recebido._sum.amount),
      pending: money(aVencer._sum.amount),
      overdue: money(atrasado._sum.amount),
    },
  };
}

// GET /clients
router.get("/", async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { userId: req.userId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { contracts: true } } },
    });

    return res.json({ clients });
  } catch (err) {
    next(err);
  }
});

// POST /clients
router.post("/", validate(clientSchema), async (req, res, next) => {
  try {
    const client = await prisma.client.create({
      // userId sempre do token
      data: { ...normalize(req.body), userId: req.userId },
    });

    return res.status(201).json({ client });
  } catch (err) {
    return handleDuplicate(err, res, next);
  }
});

// GET /clients/:id
router.get("/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: { contracts: { orderBy: { createdAt: "desc" } } },
    });

    if (!client) return res.status(404).json({ error: "Cliente nao encontrado" });

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

// PUT /clients/:id
router.put("/:id", validate(clientSchema), async (req, res, next) => {
  try {
    // 404 tanto se nao existe quanto se e de outro usuario
    const alterado = await updateOwned(
      prisma.client,
      req.params.id,
      req.userId,
      normalize(req.body)
    );

    if (!alterado) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    const client = await prisma.client.findUnique({ where: { id: req.params.id } });
    return res.json({ client });
  } catch (err) {
    return handleDuplicate(err, res, next);
  }
});

// DELETE /clients/:id
router.delete("/:id", async (req, res, next) => {
  try {
    // contratos vao junto (cascade)
    if (!(await deleteOwned(prisma.client, req.params.id, req.userId))) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
