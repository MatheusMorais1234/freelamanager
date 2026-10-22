// Valida o JWT e coloca o id em req.userId

import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  // Authorization: Bearer <token>
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Token nao enviado" });
  }

  const token = header.slice(7); // remove o "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = payload.sub;
    next(); // libera: segue para a proxima funcao/rota
  } catch {
    return res.status(401).json({ error: "Token invalido ou expirado" });
  }
}
