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
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Aplica autenticacao a TODAS as rotas deste arquivo de uma vez.
router.use(authenticate);

const clientSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.email("E-mail invalido").optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(120).optional().or(z.literal("")),
});

// Converte "" em null, para o banco guardar ausencia de verdade
// em vez de string vazia.
function normalize(data) {
  return {
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    company: data.company || null,
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
    next(err);
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

    return res.json({ client });
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
    next(err);
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
