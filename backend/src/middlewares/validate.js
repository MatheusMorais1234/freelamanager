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
