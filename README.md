# FreelaManager

[![CI](https://github.com/MatheusMorais1234/freelamanager/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusMorais1234/freelamanager/actions/workflows/ci.yml)

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
| Testes | Vitest + Supertest |

---

## Funcionalidades

- Cadastro e login com senha protegida por hash (bcrypt)
- Sessão via JWT com expiração
- **Cadastro completo de clientes**: pessoa física ou jurídica, CPF/CNPJ com
  validação de dígito verificador, inscrição estadual, endereço completo com
  busca automática por CEP, múltiplos contatos e observações
- **Ficha do cliente**: cadastro completo, contratos ligados a ele e quanto já
  pagou, ainda deve e está em atraso
- CRUD completo de contratos, com status, valor e prazo
- **Controle de pagamentos**: cada contrato se divide em parcelas com
  vencimento, valor e forma de recebimento. Parcelamento automático em até 60x,
  baixa em um clique direto na tabela e totais de recebido / a receber /
  atrasado
- Painel com gráficos de distribuição por status e faturamento mensal
- Alerta de prazos vencendo ou em atraso, e de parcelas vencidas
- Busca por nome, empresa, cidade ou documento (com ou sem pontuação)
- **Relatórios por período**, com totais, quebra por cliente e por forma de
  recebimento, e exportação em CSV
- **Tema claro e escuro**, alternável na barra superior e lembrado entre visitas
- **Conta de demonstração** com dados fictícios, para conhecer o sistema sem
  precisar cadastrar nada
- **Isolamento total entre usuários**: toda consulta é filtrada pelo dono

> **Login social:** os botões de Google e Facebook nas telas de entrada são
> demonstração visual — aparecem desabilitados e marcados como "em breve".
> Não há OAuth implementado por trás deles.

---

## Estrutura

```
freelancer/
├── .github/workflows/ci.yml     esteira de testes e build
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        modelo do banco
│   │   ├── seed-demo.mjs        massa de demonstração
│   │   └── migrations/          histórico versionado do banco
│   ├── src/
│   │   ├── lib/prisma.js        conexão única com o banco
│   │   ├── middlewares/         autenticação e validação
│   │   ├── routes/              auth, clients, contracts, payments, reports
│   │   ├── app.js               montagem do Express
│   │   └── server.js            ponto de entrada
│   ├── tests/                   suíte de integração (Vitest)
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── lib/                 cliente HTTP, formatação/máscaras, CEP, CSV
    │   ├── context/             autenticação e tema (claro/escuro)
    │   ├── components/
    │   │   ├── ui/              componentes do shadcn/ui
    │   │   └── ...              layout, marca, formulário e detalhe de
    │   │                         cliente, detalhe de contrato, estados
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

### 4. Dados de demonstração (opcional)

Para ver o sistema cheio em vez de telas vazias:

```bash
cd backend
npm run seed:demo
```

O script cria uma conta com 6 clientes, 8 contratos e 19 parcelas espalhadas
pelos últimos meses — inclusive uma vencida, para o alerta do painel aparecer.
Entre com:

| | |
|---|---|
| e-mail | `demo@freelamanager.com` |
| senha | `demo1234` |

Com `VITE_DEMO_EMAIL` e `VITE_DEMO_PASSWORD` preenchidos no `.env` do frontend,
a tela de login ganha um botão que entra direto nessa conta. Sem essas
variáveis, o botão não aparece — uma instalação real não anuncia um login que
não existe.

O seed apaga e recria **apenas** os dados dessa conta; contas reais no mesmo
banco não são tocadas.

---

## Testes

```bash
cd backend  && npm test    # 95 testes de integração
cd frontend && npm test    # 45 testes das funções puras
```

Ambos aceitam `npm run test:watch`.

### Backend — 95 testes em 7 arquivos (Vitest + Supertest)

| Arquivo | O que prova |
|---|---|
| `document.test.js` | dígito verificador de CPF/CNPJ, inclusive o dígito trocado que só contar caracteres deixaria passar |
| `auth.test.js` | hash da senha, senha que nunca sai do backend, resposta idêntica para senha errada e e-mail inexistente, token adulterado |
| `isolation.test.js` | um usuário não lê, edita, apaga nem cria dentro da carteira do outro — e o `userId` vem do token, não do corpo |
| `clients.test.js` | normalização para dígitos, unicidade composta (`userId` + documento), totais da ficha do cliente |
| `contracts.test.js` | filtros, agregação do painel, valor trafegando como string |
| `payments.test.js` | parcelamento sem perder centavo, vencimento no fim do mês e em ano bissexto, status derivado, baixa e estorno |
| `reports.test.js` | as duas janelas de tempo do relatório, sem contar a mesma parcela duas vezes, e a soma por cliente fechando com o total |

### Frontend — 45 testes em 2 arquivos (Vitest)

| Arquivo | O que prova |
|---|---|
| `format.test.js` | máscaras de CPF/CNPJ/telefone/CEP durante a digitação, moeda vinda como string, data que não escorrega um dia por fuso |
| `csv.test.js` | escape do campo que contém o próprio separador, aspas duplicadas, zero que não é ausência |

Só funções puras: elas não precisam de navegador, e é onde mora o erro
silencioso — o que mostra o número errado sem quebrar nada.

Os do backend são testes de **integração**, com o Express e o Postgres de
verdade no meio.
O que este projeto precisa provar — isolamento entre usuários, centavos do
parcelamento — só acontece de fato com o banco participando; trocar o Prisma
por um dublê testaria o dublê.

Não há banco separado para testes: cada teste cria a própria conta com e-mail
aleatório e a apaga no fim, e o `onDelete: Cascade` leva junto clientes,
contratos e parcelas. Rodar a suíte não suja o banco de desenvolvimento nem
mexe na conta de demonstração.

### Integração contínua

A cada push e a cada pull request, o GitHub Actions
(`.github/workflows/ci.yml`) sobe um Postgres 17 descartável, aplica as
migrações do zero, roda as duas suítes e compila o frontend.

Um teste que só roda na máquina de quem escreveu não protege ninguém. Rodando
em uma máquina limpa, a esteira também prova uma segunda coisa: que o projeto
sobe do nada seguindo o README — se uma migração faltasse no repositório, a CI
quebraria antes de qualquer pessoa clonar.

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
| GET | `/clients/:id` | ✔ | Detalhe + contratos + totais recebido/a receber/atrasado |
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
| GET | `/reports` | ✔ | Fechamento de um período (`?from=` e `?to=`) |

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
- **Tema aplicado antes do React desenhar.** Um script curto no `index.html` lê
  a preferência salva e põe a classe no `<html>`. Deixar isso só para o React
  faria a tela piscar no tema errado no primeiro quadro.
- **Na primeira visita o tema segue o sistema operacional** (`prefers-color-scheme`)
  em vez de impor o nosso — e a partir daí vale a escolha do usuário.
- **Datas do seed são relativas a hoje**, nunca fixas: com datas fixas, em
  alguns meses todo "próximo vencimento" da demonstração estaria no passado.
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
  O detalhe do cliente segue a mesma regra: os totais dele saem de um punhado
  fixo de agregações, não de uma consulta por contrato.
- **O relatório tem duas janelas de tempo, e confundi-las daria número
  errado.** O *recebido* é filtrado pela data do pagamento (dinheiro que entrou
  no caixa no período); o *a receber* e o *atrasado*, pelo vencimento. Uma
  parcela que venceu em janeiro e foi paga em março conta como recebida em
  março — é assim que caixa funciona.
- **`a receber` e `atrasado` nunca contam a mesma parcela.** O corte é a data
  de hoje. Sem esse corte, uma parcela vencida entraria nos dois totais e a
  soma não fecharia com o recebido — erro que não derruba a API, só mente.
- **CSV separado por ponto e vírgula, e com BOM.** O Excel em português lê a
  vírgula como separador decimal (`1.234,56` viraria duas colunas), e sem a
  marca de codificação no início do arquivo "São Paulo" abre como "SÃ£o Paulo".
- **Filtro por cliente mora na URL** (`/contracts?client=<id>`), não no estado
  do React: o endereço pode ser copiado, recarregado e compartilhado sem
  perder o recorte. E o recorte aparece na tela com um botão de limpar —
  filtro invisível faz o usuário concluir que os registros sumiram.
- **Faturamento do painel conta pagamento recebido**, não contrato concluído.
  Contrato marcado como entregue pode ainda não ter sido pago.
