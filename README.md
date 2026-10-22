# FreelaManager

[![CI](https://github.com/MatheusMorais1234/freelamanager/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusMorais1234/freelamanager/actions/workflows/ci.yml)

Sistema pra freelancer controlar clientes, contratos e pagamentos. API REST com JWT no backend e SPA em React no front.

**Demo:** [app.matheusmorais.com](https://app.matheusmorais.com)
Na tela de login tem o botão "Entrar com a conta de demonstração" (`demo@freelamanager.com` / `demo1234`). Os dados da demo são resetados a cada 24h, pode mexer à vontade.

## Stack

- **Front:** React 19, Vite, React Router, Tailwind 4, shadcn/ui, Recharts
- **Back:** Node 24, Express 5, Prisma 7, PostgreSQL 17, Zod, JWT + bcrypt
- **Testes:** Vitest + Supertest, rodando no GitHub Actions

## O que tem

- Cadastro/login com JWT
- Clientes PF e PJ com validação de CPF/CNPJ, busca de endereço por CEP (ViaCEP)
- Ficha do cliente com contratos e quanto já pagou / deve / está atrasado
- Contratos com status, valor e prazo
- Parcelas: parcelamento automático (até 60x), baixa com um clique, status recebido / a receber / atrasado
- Dashboard com gráficos e alertas de vencimento
- Relatório por período com exportação CSV
- Tema claro e escuro
- Cada usuário só enxerga os próprios dados

Os botões de login com Google/Facebook são só visuais por enquanto (aparecem como "em breve").

## Rodando local

Precisa de Node 24+ e um Postgres.

```bash
# backend
cd backend
npm install
cp .env.example .env        # DATABASE_URL e JWT_SECRET
npx prisma migrate dev
npm run dev                 # localhost:3000

# frontend
cd frontend
npm install
cp .env.example .env
npm run dev                 # localhost:5173
```

Pra gerar um JWT_SECRET:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Pra popular com dados de exemplo:

```bash
cd backend && npm run seed:demo
```

Cria a conta `demo@freelamanager.com` / `demo1234` com alguns clientes, contratos e parcelas (inclusive uma atrasada). Só mexe nessa conta. Se colocar `VITE_DEMO_EMAIL` e `VITE_DEMO_PASSWORD` no `.env` do front, aparece o botão de entrar na demo.

## Testes

```bash
cd backend  && npm test     # integração (Express + Postgres de verdade)
cd frontend && npm test     # funções de formatação e CSV
```

No backend os testes cobrem principalmente: isolamento entre usuários, validação de CPF/CNPJ, parcelamento sem perder centavo, vencimento no fim do mês (31/01 → 28/02 → 31/03) e os totais do relatório. Cada teste cria a própria conta e apaga no final, então dá pra rodar no banco de dev.

A CI sobe um Postgres, roda as migrations do zero, os testes e o build do front.

## API

Rotas protegidas usam `Authorization: Bearer <token>`.

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/register` | Cria conta |
| POST | `/auth/login` | Login |
| GET | `/auth/me` | Usuário logado |
| GET/POST | `/clients` | Lista / cria |
| GET/PUT/DELETE | `/clients/:id` | Detalhe (com totais) / atualiza / remove |
| GET/POST | `/contracts` | Lista (`?status=`, `?clientId=`) / cria |
| GET | `/contracts/stats` | Totais pro dashboard |
| GET/PUT/DELETE | `/contracts/:id` | Detalhe / atualiza / remove |
| GET/POST | `/payments` | Lista (`?contractId=`, `?clientId=`, `?status=`) / cria parcela(s) |
| GET | `/payments/summary` | Recebido, a receber, atrasado e por mês |
| GET/PUT/DELETE | `/payments/:id` | Detalhe / atualiza / remove |
| PATCH | `/payments/:id/settle` | Dá baixa (ou desfaz) |
| GET | `/reports` | Relatório do período (`?from=&to=`) |
| GET | `/health` | Health check |

## Algumas decisões

- Valores em `Decimal` e trafegando como string no JSON, pra não perder centavo.
- Todas as queries filtram por `userId`. Registro de outro usuário retorna 404.
- O status da parcela (pago/pendente/atrasado) não é salvo no banco, é calculado a partir de `paid_at` e da data de vencimento.
- Parcelamento é dividido em centavos inteiros; a sobra vai pra primeira parcela.
- CPF, CNPJ, telefone e CEP são salvos só com dígitos. A máscara é só no front.
- No relatório, "recebido" usa a data do pagamento e "a receber/atrasado" usa o vencimento.
- CSV com `;` e BOM pra abrir certinho no Excel em português.

## Deploy

Tá rodando na Hostinger (Node) com o banco no Neon. Em produção é um app Express só: a API fica em `/api` e o próprio Express serve o build do React. As variáveis (`DATABASE_URL`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `API_PREFIX=/api`, `DEMO_RESET=1`) ficam no painel da hospedagem.
