// ============================================================
// Rotas de contratos (CRUD) - todas protegidas
//   GET    /contracts       lista (aceita ?status= e ?clientId=)
//   GET    /contracts/stats resumo para o dashboard
//   POST   /contracts       cria
//   GET    /contracts/:id   detalhe
//   PUT    /contracts/:id   atualiza
//   DELETE /contracts/:id   remove
// ============================================================

import { Router } from "express";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { validate, validateQuery, filtroOpcional } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";
import { serializePayment } from "../lib/payment-status.js";
import { CONTRACT_STATUSES } from "../lib/enums.js";
import { money } from "../lib/money.js";
import { ownsClient, updateOwned, deleteOwned } from "../lib/ownership.js";

const router = Router();
router.use(authenticate);

const contractSchema = z.object({
  clientId: z.uuid("Cliente invalido"),
  title: z.string().trim().min(2, "Titulo muito curto").max(160),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  // coerce: aceita "1500.50" vindo do formulario e converte em numero
  amount: z.coerce.number().nonnegative("Valor nao pode ser negativo"),
  status: z.enum(CONTRACT_STATUSES).default("PENDING"),
  dueDate: z.coerce.date().optional().nullable(),
});

// O Prisma devolve Decimal como objeto (para nao perder precisao).
// JSON nao tem tipo decimal, entao mandamos como STRING - o
// frontend formata. Numero em ponto flutuante estragaria centavos.
function serialize(contract) {
  return { ...contract, amount: money(contract.amount) };
}

// ------------------------------------------------------------
// FILTROS DA LISTA (?status= ?clientId=)
// ------------------------------------------------------------
// clientId e uma coluna uuid: repassar "abc" cru faria o
// Postgres recusar, e o erro subiria como 500 - a API assumindo
// a culpa de um pedido que estava errado. Validado aqui, vira
// um 400 dizendo qual campo.
const contractFiltersSchema = z.object({
  status: filtroOpcional(z.enum(CONTRACT_STATUSES, { error: "Situacao invalida" })),
  clientId: filtroOpcional(z.uuid("Cliente invalido")),
});

/**
 * Quanto ja foi recebido em cada contrato.
 *
 * Um groupBy resolve a lista INTEIRA numa consulta so. A
 * alternativa obvia - percorrer os contratos perguntando o total
 * de cada um - faria uma ida ao banco por linha (o problema
 * classico do "N+1"): 50 contratos, 51 consultas.
 *
 * Devolve um Map de contractId -> total recebido (string).
 */
async function paidByContract(userId, contractId) {
  const rows = await prisma.payment.groupBy({
    by: ["contractId"],
    where: {
      userId,
      paidAt: { not: null },
      // O detalhe de um contrato passa o id e soma so aquele.
      ...(contractId ? { contractId } : {}),
    },
    _sum: { amount: true },
  });

  return new Map(rows.map((r) => [r.contractId, money(r._sum.amount)]));
}

// ------------------------------------------------------------
// GET /contracts
// ------------------------------------------------------------
router.get("/", validateQuery(contractFiltersSchema), async (req, res, next) => {
  try {
    // req.query e somente-leitura no Express 5, entao o
    // middleware deixa os filtros ja validados em req.filtros.
    const { status, clientId } = req.filtros;

    const [contracts, paid] = await Promise.all([
      prisma.contract.findMany({
        where: {
          userId: req.userId,
          ...(status ? { status } : {}),
          ...(clientId ? { clientId } : {}),
        },
        orderBy: { createdAt: "desc" },
        include: { client: { select: { id: true, name: true, company: true } } },
      }),
      paidByContract(req.userId),
    ]);

    // "paidAmount" acompanha cada contrato para a tela mostrar
    // quanto ja entrou sem precisar de uma segunda chamada.
    return res.json({
      contracts: contracts.map((c) => ({
        ...serialize(c),
        paidAmount: paid.get(c.id) ?? "0",
      })),
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /contracts/stats
// ------------------------------------------------------------
// ATENCAO: esta rota vem ANTES de "/:id". Se viesse depois, o
// Express casaria "stats" como se fosse um id.
router.get("/stats", async (req, res, next) => {
  try {
    // groupBy faz a soma no BANCO, nao em JavaScript.
    // Somar no banco e muito mais rapido do que baixar
    // todos os contratos e somar aqui.
    const grouped = await prisma.contract.groupBy({
      by: ["status"],
      where: { userId: req.userId },
      _count: { _all: true },
      _sum: { amount: true },
    });

    const byStatus = Object.fromEntries(
      CONTRACT_STATUSES.map((s) => {
        const row = grouped.find((g) => g.status === s);
        return [
          s,
          {
            count: row?._count._all ?? 0,
            total: money(row?._sum.amount),
          },
        ];
      })
    );

    const totalContracts = grouped.reduce((acc, g) => acc + g._count._all, 0);
    const totalClients = await prisma.client.count({ where: { userId: req.userId } });

    return res.json({ stats: { totalContracts, totalClients, byStatus } });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /contracts
// ------------------------------------------------------------
router.post("/", validate(contractSchema), async (req, res, next) => {
  try {
    const { clientId, ...rest } = req.body;

    // Aqui esta a validacao que o user_id "extra" na tabela exige:
    // confirmamos que o cliente informado pertence mesmo a quem
    // esta logado, antes de gravar os dois ids juntos.
    if (!(await ownsClient(clientId, req.userId))) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    const contract = await prisma.contract.create({
      data: {
        ...rest,
        description: rest.description || null,
        clientId,
        userId: req.userId,
      },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    return res.status(201).json({ contract: serialize(contract) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /contracts/:id
// ------------------------------------------------------------
router.get("/:id", async (req, res, next) => {
  try {
    // O detalhe traz as parcelas junto: quem abre um contrato
    // quer ver o dinheiro dele, e nao clicar de novo para isso.
    const contract = await prisma.contract.findFirst({
      where: { id: req.params.id, userId: req.userId },
      include: {
        client: { select: { id: true, name: true, company: true } },
        payments: { orderBy: { dueDate: "asc" } },
      },
    });

    if (!contract) return res.status(404).json({ error: "Contrato nao encontrado" });

    // As parcelas saem daqui com o mesmo formato de /payments -
    // inclusive o status derivado -, para a tela poder reusar o
    // mesmo selo colorido nos dois lugares.
    const payments = contract.payments.map((p) => serializePayment(p));

    // O total recebido sai do MESMO caminho da listagem, e nao de
    // um reduce aqui: somar Decimal em JavaScript devolveria
    // coisas como 6666.679999999999, e o formato do campo
    // mudaria de tela para tela.
    const paid = await paidByContract(req.userId, contract.id);

    return res.json({
      contract: {
        ...serialize(contract),
        payments,
        paidAmount: paid.get(contract.id) ?? "0",
      },
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// PUT /contracts/:id
// ------------------------------------------------------------
router.put("/:id", validate(contractSchema), async (req, res, next) => {
  try {
    const { clientId, ...rest } = req.body;

    if (!(await ownsClient(clientId, req.userId))) {
      return res.status(404).json({ error: "Cliente nao encontrado" });
    }

    const alterado = await updateOwned(prisma.contract, req.params.id, req.userId, {
      ...rest,
      description: rest.description || null,
      clientId,
    });

    if (!alterado) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    const contract = await prisma.contract.findUnique({
      where: { id: req.params.id },
      include: { client: { select: { id: true, name: true, company: true } } },
    });

    return res.json({ contract: serialize(contract) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// DELETE /contracts/:id
// ------------------------------------------------------------
router.delete("/:id", async (req, res, next) => {
  try {
    if (!(await deleteOwned(prisma.contract, req.params.id, req.userId))) {
      return res.status(404).json({ error: "Contrato nao encontrado" });
    }

    return res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
