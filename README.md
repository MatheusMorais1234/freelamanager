# FreelaManager

Sistema de gestão de **clientes, contratos e pagamentos** para freelancers.
Projeto full-stack construído do zero: API REST autenticada por JWT e uma SPA em React.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 8, React Router 7 |
| Interface | Tailwind CSS 4, shadcn/ui (Radix), lucide-react |
| Gráficos | Recharts |
| Backend | Node.js 24, Express 5 |
| Banco | PostgreSQL 17 + Prisma 7 (ORM) |
| Autenticação | JWT + bcrypt |
| Validação | Zod |

---

## Funcionalidades

- Cadastro e login com senha protegida por hash (bcrypt)
- Sessão via JWT com expiração
- **Cadastro completo de clientes**: pessoa física ou jurídica, CPF/CNPJ com
  validação de dígito verificador, inscrição estadual, endereço completo com
  busca automática por CEP, múltiplos contatos e observações
- CRUD completo de contratos, com status, valor e prazo
- **Controle de pagamentos**: cada contrato se divide em parcelas com
  vencimento, valor e forma de recebimento. Parcelamento automático em até 60x,
  baixa em um clique direto na tabela e totais de recebido / a receber /
  atrasado
- Painel com gráficos de distribuição por status e faturamento mensal
- Alerta de prazos vencendo ou em atraso, e de parcelas vencidas
- Busca por nome, empresa, cidade ou documento (com ou sem pontuação)
- **Isolamento total entre usuários**: toda consulta é filtrada pelo dono

> **Login social:** os botões de Google e Facebook nas telas de entrada são
> demonstração visual — aparecem desabilitados e marcados como "em breve".
> Não há OAuth implementado por trás deles.

---

## Estrutura

```
freelancer/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        modelo do banco
│   │   └── migrations/          histórico versionado do banco
│   ├── src/
│   │   ├── lib/prisma.js        conexão única com o banco
│   │   ├── middlewares/         autenticação e validação
│   │   ├── routes/              auth, clients, contracts, payments
│   │   ├── app.js               montagem do Express
│   │   └── server.js            ponto de entrada
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── lib/                 cliente HTTP, formatação/máscaras, busca de CEP
    │   ├── context/             estado de autenticação
    │   ├── components/
    │   │   ├── ui/              componentes do shadcn/ui
    │   │   └── ...              layout, marca, formulário de cliente, estados
    │   ├── pages/               login, cadastro, painel, clientes,
    │   │                         contratos, pagamentos
    │   ├── index.css            tokens do tema (grafite + âmbar)
    │   └── App.jsx              rotas
    └── .env.example
```

---

## Como rodar

**Pré-requisitos:** Node.js 22+ e PostgreSQL rodando.

### 1. Banco

```sql
CREATE DATABASE freelamanager;
```

### 2. Backend

```bash
cd backend
npm install
cp .env.example .env        # preencha DATABASE_URL e JWT_SECRET
npx prisma migrate dev      # cria as tabelas
npm run dev                 # http://localhost:3000
```

Gere um `JWT_SECRET` seguro com:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev                 # http://localhost:5173
```

---

## API

Rotas protegidas exigem o cabeçalho `Authorization: Bearer <token>`.

| Método | Rota | Auth | Descrição |
|---|---|:--:|---|
| GET | `/health` | – | Verifica se a API está no ar |
| POST | `/auth/register` | – | Cria conta e devolve token |
| POST | `/auth/login` | – | Autentica e devolve token |
| GET | `/auth/me` | ✔ | Dados do usuário logado |
| GET | `/clients` | ✔ | Lista clientes |
| POST | `/clients` | ✔ | Cria cliente |
| GET | `/clients/:id` | ✔ | Detalhe + contratos |
| PUT | `/clients/:id` | ✔ | Atualiza |
| DELETE | `/clients/:id` | ✔ | Remove (apaga os contratos junto) |
| GET | `/contracts` | ✔ | Lista (`?status=` e `?clientId=`) |
| GET | `/contracts/stats` | ✔ | Totais para o painel |
| POST | `/contracts` | ✔ | Cria |
| GET | `/contracts/:id` | ✔ | Detalhe |
| PUT | `/contracts/:id` | ✔ | Atualiza |
| DELETE | `/contracts/:id` | ✔ | Remove (apaga as parcelas junto) |
| GET | `/payments` | ✔ | Lista (`?contractId=`, `?clientId=`, `?status=`) |
| GET | `/payments/summary` | ✔ | Recebido, a receber, atrasado e faturamento mensal |
| POST | `/payments` | ✔ | Cria uma parcela ou um parcelamento inteiro |
| GET | `/payments/:id` | ✔ | Detalhe |
| PUT | `/payments/:id` | ✔ | Atualiza |
| PATCH | `/payments/:id/settle` | ✔ | Dá baixa no recebimento (ou desfaz) |
| DELETE | `/payments/:id` | ✔ | Remove |

Status possíveis de um contrato: `PENDING`, `ACTIVE`, `COMPLETED`, `CANCELLED`.

Status de um pagamento: `PENDING` (a receber), `PAID` (recebido) e `OVERDUE`
(atrasado). Ele **não existe no banco** — é calculado na leitura.

Formas de pagamento: `PIX`, `TRANSFER`, `BOLETO`, `CARD`, `CASH`, `OTHER`.

---

## Decisões técnicas

- **IDs em UUID** em vez de sequenciais: impedem enumeração de registros pela URL.
- **`Decimal` para valores**, nunca `Float` — ponto flutuante perde centavos.
  O valor trafega como *string* no JSON, e só vira número na formatação da tela.
- **Filtro por dono em toda query.** Rotas de leitura e escrita usam
  `findFirst` / `updateMany` / `deleteMany` com `userId` no `where`, então um
  registro de outro usuário responde 404 em vez de vazar.
- **Senha nunca sai do backend:** todas as consultas de usuário usam `select`
  explícito, sem o campo `passwordHash`.
- **Login com resposta genérica** ("e-mail ou senha incorretos") e comparação
  bcrypt mesmo quando o usuário não existe, para não revelar quais e-mails
  estão cadastrados.
- **Segredos só em variáveis de ambiente.** `.env` fora do Git desde o commit
  inicial.
- **Documento, telefone e CEP gravados só com dígitos.** A máscara existe
  apenas na tela. Sem isso, `123.456.789-00` e `12345678900` virariam dois
  cadastros diferentes, e a busca teria que adivinhar a pontuação.
- **CPF/CNPJ conferido pelo dígito verificador**, no backend e no frontend.
  Checar só a quantidade de dígitos deixaria passar erro de digitação.
- **Unicidade composta (`userId` + `document`)**: o mesmo CPF não se repete
  para um freelancer, mas dois freelancers podem atender o mesmo cliente.
- **Tema em tokens do shadcn/ui.** Os componentes leem `bg-background`,
  `text-muted-foreground` etc., nunca cores fixas — trocar a marca inteira é
  mexer só em `frontend/src/index.css`.
- **`AlertDialog` para exclusão**, não `Dialog`: ação destrutiva exige escolha
  explícita e prende o foco.
- **Status do pagamento é derivado, não gravado.** A tabela guarda só `paid_at`;
  "atrasado" nasce de comparar o vencimento com a data de hoje. Se o status
  fosse uma coluna, uma parcela vencida na virada da meia-noite continuaria
  marcada como pendente até alguém rodar alguma rotina — e ainda seria possível
  gravar "pago" sem data de pagamento.
- **Parcelamento dividido em centavos inteiros.** `10.000,01` em 3x vira
  `3.333,35 + 3.333,33 + 3.333,33`. Dividir em ponto flutuante e arredondar
  cada parcela faria a soma não fechar com o total.
- **Vencimento mensal que respeita o fim do mês.** Uma parcela do dia 31 cai em
  28/02 e volta para 31/03 — somar 30 dias iria escorregando a data a cada mês.
- **Total recebido por contrato vem de um `groupBy`**, não de uma consulta por
  linha da lista: 50 contratos são 2 idas ao banco, não 51 (o problema "N+1").
- **Faturamento do painel conta pagamento recebido**, não contrato concluído.
  Contrato marcado como entregue pode ainda não ter sido pago.
