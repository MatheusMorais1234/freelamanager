// ============================================================
// Massa de demonstracao
// ------------------------------------------------------------
// Roda com:  npm run seed:demo
//
// Cria (ou recria) UMA conta de demonstracao com clientes,
// contratos e parcelas espalhadas nos ultimos meses, para quem
// clonar o repositorio ver o sistema cheio - e nao quatro telas
// vazias dizendo "nenhum registro ainda".
//
// IMPORTANTE: o script apaga e recria SO os dados dessa conta
// de demonstracao. Como toda tabela e filtrada por userId, as
// contas reais nao sao tocadas.
// ============================================================

import "dotenv/config";
import bcrypt from "bcrypt";

import { prisma } from "../src/lib/prisma.js";

const DEMO_EMAIL = "demo@freelamanager.com";
const DEMO_SENHA = "demo1234";

// Datas relativas a hoje. Guardar datas fixas no script faria a
// demonstracao envelhecer: em seis meses todos os "proximos
// vencimentos" ja estariam no passado.
const hoje = new Date();

function dia(offsetDias) {
  const d = new Date(hoje);
  d.setDate(d.getDate() + offsetDias);
  return d;
}

function mes(offsetMeses, diaDoMes = 10) {
  return new Date(hoje.getFullYear(), hoje.getMonth() + offsetMeses, diaDoMes);
}

// ------------------------------------------------------------
// Clientes: uma mistura de PF e PJ, com endereco real o
// suficiente para as telas de detalhe nao ficarem com buracos.
// ------------------------------------------------------------
const CLIENTES = [
  {
    type: "COMPANY",
    name: "Padaria Aurora Ltda",
    company: "Padaria Aurora",
    document: "19131243000197",
    stateRegistration: "110042490114",
    email: "contato@padariaaurora.com.br",
    phone: "1132145678",
    mobile: "11987654321",
    website: "https://padariaaurora.com.br",
    zipCode: "01310100",
    street: "Avenida Paulista",
    number: "1578",
    complement: "Loja 3",
    district: "Bela Vista",
    city: "São Paulo",
    state: "SP",
    notes: "Cliente desde o primeiro site. Prefere falar por WhatsApp.",
  },
  {
    type: "COMPANY",
    name: "Studio Bravo Comunicação ME",
    company: "Studio Bravo",
    document: "45997418000153",
    stateRegistration: "287654321119",
    email: "financeiro@studiobravo.com.br",
    phone: "1128889090",
    zipCode: "04538133",
    street: "Avenida Brigadeiro Faria Lima",
    number: "3477",
    district: "Itaim Bibi",
    city: "São Paulo",
    state: "SP",
    notes: "Paga sempre por boleto, com 15 dias de prazo.",
  },
  {
    type: "PERSON",
    name: "Camila Ferraz",
    document: "39053344705",
    birthDate: new Date(1991, 4, 22),
    email: "camila.ferraz@gmail.com",
    mobile: "21998887766",
    zipCode: "22071900",
    street: "Avenida Atlântica",
    number: "1702",
    complement: "Apto 801",
    district: "Copacabana",
    city: "Rio de Janeiro",
    state: "RJ",
    notes: "Nutricionista. Indicou dois clientes novos.",
  },
  {
    type: "COMPANY",
    name: "Verde Vale Alimentos S.A.",
    company: "Verde Vale",
    document: "07526557000100",
    stateRegistration: "062334567890",
    email: "compras@verdevale.com.br",
    phone: "3133214455",
    zipCode: "30140071",
    street: "Rua da Bahia",
    number: "1200",
    district: "Centro",
    city: "Belo Horizonte",
    state: "MG",
    notes: "Maior contrato da carteira. Fechamento sempre no dia 5.",
  },
  {
    type: "PERSON",
    name: "Rodrigo Antunes",
    document: "12345678909",
    birthDate: new Date(1986, 10, 3),
    email: "rodrigo@antunesadv.com.br",
    mobile: "51991234567",
    zipCode: "90010150",
    street: "Rua dos Andradas",
    number: "1234",
    complement: "Sala 502",
    district: "Centro Histórico",
    city: "Porto Alegre",
    state: "RS",
    notes: "Advogado. Costuma pedir ajustes fora do escopo.",
  },
  {
    type: "COMPANY",
    name: "Clínica Bem Viver Ltda",
    company: "Bem Viver",
    document: "34028316000103",
    email: "adm@clinicabemviver.com.br",
    phone: "4133445566",
    zipCode: "80420090",
    street: "Rua Comendador Araújo",
    number: "499",
    district: "Batel",
    city: "Curitiba",
    state: "PR",
  },
];

// ------------------------------------------------------------
// Contratos e suas parcelas.
// A distribuicao e proposital: contratos concluidos e pagos nos
// meses anteriores (para o grafico de faturamento ter barras),
// contratos em andamento com parcelas a vencer, um prazo
// estourando esta semana e uma parcela em atraso - que e o que
// faz o alerta vermelho do painel aparecer.
// ------------------------------------------------------------
const CONTRATOS = [
  {
    cliente: "Verde Vale Alimentos S.A.",
    title: "Plataforma de pedidos para representantes",
    description:
      "Aplicacao web para a equipe comercial registrar pedidos em campo, com catalogo, tabela de precos por regiao e exportacao para o ERP.",
    amount: "48000.00",
    status: "ACTIVE",
    dueDate: dia(45),
    parcelas: [
      { description: "Entrada (30%)", amount: "14400.00", dueDate: mes(-3, 5), paidAt: mes(-3, 5), method: "TRANSFER" },
      { description: "Parcela 2/4", amount: "11200.00", dueDate: mes(-2, 5), paidAt: mes(-2, 6), method: "TRANSFER" },
      { description: "Parcela 3/4", amount: "11200.00", dueDate: mes(-1, 5), paidAt: mes(-1, 5), method: "PIX" },
      { description: "Parcela 4/4 - entrega", amount: "11200.00", dueDate: mes(1, 5) },
    ],
  },
  {
    cliente: "Studio Bravo Comunicação ME",
    title: "Identidade visual e site institucional",
    description:
      "Redesenho da marca, manual de uso e site institucional de cinco paginas com blog integrado.",
    amount: "16500.00",
    status: "ACTIVE",
    dueDate: dia(6),
    parcelas: [
      { description: "Entrada (50%)", amount: "8250.00", dueDate: mes(-1, 15), paidAt: mes(-1, 15), method: "BOLETO" },
      { description: "Entrega final", amount: "8250.00", dueDate: dia(12) },
    ],
  },
  {
    cliente: "Padaria Aurora Ltda",
    title: "Cardápio digital com QR Code",
    description:
      "Cardapio responsivo com fotos, precos por turno e atualizacao pelo proprio cliente.",
    amount: "4800.00",
    status: "COMPLETED",
    dueDate: mes(-2, 20),
    parcelas: [
      { description: "Parcela 1/2", amount: "2400.00", dueDate: mes(-3, 20), paidAt: mes(-3, 20), method: "PIX" },
      { description: "Parcela 2/2", amount: "2400.00", dueDate: mes(-2, 20), paidAt: mes(-2, 21), method: "PIX" },
    ],
  },
  {
    cliente: "Camila Ferraz",
    title: "Landing page de captação + automação de e-mail",
    description:
      "Pagina de captura com formulario integrado ao disparador de e-mails e sequencia de boas-vindas.",
    amount: "3200.00",
    status: "COMPLETED",
    dueDate: mes(-4, 28),
    parcelas: [
      { description: "Pagamento único", amount: "3200.00", dueDate: mes(-4, 28), paidAt: mes(-4, 28), method: "PIX" },
    ],
  },
  {
    cliente: "Rodrigo Antunes",
    title: "Site do escritório de advocacia",
    description:
      "Site institucional com areas de atuacao, equipe e formulario de contato com aviso por e-mail.",
    amount: "7400.00",
    status: "ACTIVE",
    dueDate: dia(20),
    parcelas: [
      { description: "Entrada", amount: "3700.00", dueDate: dia(-18), paidAt: dia(-18), method: "PIX" },
      // Esta e a parcela que dispara o alerta de atraso no painel.
      { description: "Parcela final", amount: "3700.00", dueDate: dia(-9) },
    ],
  },
  {
    cliente: "Clínica Bem Viver Ltda",
    title: "Sistema de agendamento de consultas",
    description:
      "Agenda por profissional, confirmacao por WhatsApp e bloqueio de horarios em feriados.",
    amount: "22000.00",
    status: "PENDING",
    dueDate: dia(75),
    parcelas: [
      { description: "Parcela 1/3", amount: "7333.34", dueDate: dia(15) },
      { description: "Parcela 2/3", amount: "7333.33", dueDate: dia(45) },
      { description: "Parcela 3/3", amount: "7333.33", dueDate: dia(75) },
    ],
  },
  {
    cliente: "Padaria Aurora Ltda",
    title: "Manutenção mensal do cardápio",
    description: "Ajustes de precos, fotos novas e suporte por 12 meses.",
    amount: "3600.00",
    status: "ACTIVE",
    dueDate: dia(120),
    parcelas: [
      { description: "Mensalidade", amount: "300.00", dueDate: mes(-2, 10), paidAt: mes(-2, 10), method: "PIX" },
      { description: "Mensalidade", amount: "300.00", dueDate: mes(-1, 10), paidAt: mes(-1, 10), method: "PIX" },
      { description: "Mensalidade", amount: "300.00", dueDate: mes(0, 10), paidAt: mes(0, 10), method: "PIX" },
      { description: "Mensalidade", amount: "300.00", dueDate: mes(1, 10) },
      { description: "Mensalidade", amount: "300.00", dueDate: mes(2, 10) },
    ],
  },
  {
    cliente: "Studio Bravo Comunicação ME",
    title: "Campanha de lançamento - peças para redes",
    description: "Trinta pecas para Instagram e LinkedIn, em tres formatos.",
    amount: "5200.00",
    status: "CANCELLED",
    dueDate: mes(-1, 25),
    parcelas: [],
  },
];

async function main() {
  console.log("Preparando a conta de demonstração...\n");

  const passwordHash = await bcrypt.hash(DEMO_SENHA, 10);

  // upsert: rodar o script duas vezes nao quebra por e-mail
  // duplicado, so atualiza a conta que ja existe.
  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash },
    create: { name: "Matheus Demonstração", email: DEMO_EMAIL, passwordHash },
    select: { id: true },
  });

  // Limpa APENAS o que pertence a esta conta. Apagar os clientes
  // derruba contratos e parcelas junto, pelo onDelete: Cascade.
  await prisma.client.deleteMany({ where: { userId: user.id } });

  const idsPorNome = new Map();

  for (const c of CLIENTES) {
    const criado = await prisma.client.create({
      data: { ...c, userId: user.id },
      select: { id: true, name: true },
    });
    idsPorNome.set(criado.name, criado.id);
  }
  console.log(`  ${CLIENTES.length} clientes`);

  let totalParcelas = 0;

  for (const contrato of CONTRATOS) {
    const { cliente, parcelas, ...dados } = contrato;

    await prisma.contract.create({
      data: {
        ...dados,
        userId: user.id,
        clientId: idsPorNome.get(cliente),
        // Nested write: contrato e parcelas nascem na MESMA
        // transacao. Se algo falhar no meio, nada e gravado.
        payments: {
          create: parcelas.map((p) => ({ ...p, userId: user.id })),
        },
      },
    });

    totalParcelas += parcelas.length;
  }
  console.log(`  ${CONTRATOS.length} contratos`);
  console.log(`  ${totalParcelas} parcelas\n`);

  console.log("Pronto. Entre no sistema com:");
  console.log(`  e-mail: ${DEMO_EMAIL}`);
  console.log(`  senha:  ${DEMO_SENHA}\n`);
}

main()
  .catch((err) => {
    console.error("Falhou:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
