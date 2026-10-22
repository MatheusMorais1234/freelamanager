import { z } from "zod";

// Valida req.body com zod

export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return res.status(400).json({
        error: "Dados invalidos",
        fields: Object.fromEntries(
          result.error.issues.map((i) => [i.path.join("."), i.message])
        ),
      });
    }

    req.body = result.data;
    next();
  };
}

// Mesma coisa pra query string. Evita 500 com uuid invalido.\nExpress 5 nao deixa sobrescrever req.query, entao vai em req.filtros.

// "?status=" (select vazio) conta como sem filtro
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
