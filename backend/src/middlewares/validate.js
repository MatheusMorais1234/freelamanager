import { z } from "zod";

// ============================================================
// Middleware de validacao com Zod
// ------------------------------------------------------------
// Garante que req.body tem o formato esperado ANTES da rota rodar.
// Assim a rota nunca precisa checar "e se vier undefined?".
// ============================================================

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Dados invalidos",
        // transforma os erros do Zod em { campo: mensagem }
        fields: Object.fromEntries(
          result.error.issues.map((i) => [i.path.join("."), i.message])
        ),
      });
    }

    // Substitui o body pelo dado ja validado e convertido
    // (ex.: string "2026-09-30" vira Date).
    req.body = result.data;
    next();
  };
}

// ============================================================
// Mesma ideia, para a query string (?clientId=...&status=...)
// ------------------------------------------------------------
// Por que a query tambem precisa disso: os ids sao colunas uuid
// no Postgres. Repassar "abc" cru ao Prisma faz o BANCO recusar,
// e o erro sobe como 500 "Erro interno do servidor" - a API diz
// que a culpa foi dela quando na verdade o pedido e que estava
// errado. Validando aqui, vira um 400 dizendo qual campo.
//
// req.query e somente-leitura no Express 5, entao o resultado
// vai para req.filtros em vez de sobrescrever req.query.
// ============================================================

/**
 * Filtro em branco conta como filtro ausente.
 *
 * "?status=" e o que um <select> vazio manda ao submeter o
 * formulario - e "nao filtrei por status", nao um valor errado.
 * Sem isso, limpar o filtro na tela viraria um 400.
 */
export const filtroOpcional = (schema) =>
  z.preprocess((v) => (v === "" ? undefined : v), schema.optional());

export function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return res.status(400).json({
        error: "Filtros invalidos",
        fields: Object.fromEntries(
          result.error.issues.map((i) => [i.path.join("."), i.message])
        ),
      });
    }

    req.filtros = result.data;
    next();
  };
}
