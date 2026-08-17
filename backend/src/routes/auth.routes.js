// ============================================================
// Rotas de autenticacao
//   POST /auth/register  - cria conta
//   POST /auth/login     - troca email+senha por um token
//   GET  /auth/me        - devolve o usuario logado
// ============================================================

import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";

import { prisma } from "../lib/prisma.js";
import { validate } from "../middlewares/validate.js";
import { authenticate } from "../middlewares/auth.js";

const router = Router();

// Custo do bcrypt: 2^10 rodadas. Quanto maior, mais lento de
// quebrar (e de calcular). 10-12 e o padrao recomendado.
const SALT_ROUNDS = 10;

const registerSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(120),
  email: z.email("E-mail invalido").toLowerCase(),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres"),
});

const loginSchema = z.object({
  email: z.email("E-mail invalido").toLowerCase(),
  password: z.string().min(1, "Informe a senha"),
});

// Gera o "cracha" assinado. Dentro dele vai SO o id do usuario -
// nunca senha, nunca dado sensivel (o conteudo e legivel por
// qualquer um; o que o JWT garante e que nao foi ALTERADO).
function generateToken(userId) {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });
}

// ------------------------------------------------------------
// POST /auth/register
// ------------------------------------------------------------
router.post("/register", validate(registerSchema), async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Este e-mail ja esta cadastrado" });
    }

    // A senha em texto puro NUNCA e gravada. So o hash.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const user = await prisma.user.create({
      data: { name, email, passwordHash },
      // select explicito: garante que passwordHash JAMAIS
      // sai numa resposta HTTP por descuido.
      select: { id: true, name: true, email: true, createdAt: true },
    });

    return res.status(201).json({ user, token: generateToken(user.id) });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// POST /auth/login
// ------------------------------------------------------------
router.post("/login", validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });

    // Compara a senha digitada com o hash guardado.
    // Se o usuario nao existe, ainda assim rodamos um compare
    // falso para o tempo de resposta nao denunciar quais
    // e-mails existem no banco (timing attack).
    const ok = user
      ? await bcrypt.compare(password, user.passwordHash)
      : await bcrypt.compare(password, "$2b$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid");

    if (!user || !ok) {
      // Mensagem generica de proposito: nao revela se o erro
      // foi no e-mail ou na senha.
      return res.status(401).json({ error: "E-mail ou senha incorretos" });
    }

    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token: generateToken(user.id),
    });
  } catch (err) {
    next(err);
  }
});

// ------------------------------------------------------------
// GET /auth/me  (protegida)
// ------------------------------------------------------------
router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) return res.status(404).json({ error: "Usuario nao encontrado" });

    return res.json({ user });
  } catch (err) {
    next(err);
  }
});

export default router;
