// ============================================================
// Middleware de autenticacao
// ------------------------------------------------------------
// Roda ANTES das rotas protegidas. Le o token JWT do cabecalho,
// confere a assinatura e coloca o id do dono em req.userId.
// Se o token faltar ou for invalido, corta a requisicao aqui
// e a rota nunca chega a executar.
// ============================================================

import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  // O padrao HTTP manda o token assim:  Authorization: Bearer <token>
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token nao enviado" });
  }

  const token = header.slice(7); // remove o "Bearer "

  try {
    // verify() confere a ASSINATURA e a validade (exp).
    // Se alguem alterou o conteudo do token, isto lanca erro.
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // A partir daqui, toda rota sabe quem e o dono da requisicao.
    req.userId = payload.sub;
    next(); // libera: segue para a proxima funcao/rota
  } catch {
    return res.status(401).json({ error: "Token invalido ou expirado" });
  }
}
