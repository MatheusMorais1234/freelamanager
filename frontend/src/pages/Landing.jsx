// ============================================================
// Landing.jsx - pagina inicial para quem nao esta logado
// ------------------------------------------------------------
// Mora no mesmo endereco do painel ("/"): o porteiro do App.jsx
// mostra esta tela quando nao ha usuario e o painel quando ha.
// Assim o link que se compartilha e um so.
//
// Tudo aqui descreve o que o sistema JA faz - nada de recurso
// prometido. O login social, por exemplo, ainda e so visual,
// entao nao aparece.
// ============================================================

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  FileText,
  FolderGit2,
  Loader2,
  PlayCircle,
  ShieldCheck,
  Users,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext.jsx";
import Brand from "@/components/Brand.jsx";
import { Button } from "@/components/ui/button.jsx";
import { cn } from "@/lib/utils.js";

// O "lg" do design system (h-9) e pensado para formularios; na landing
// o botao principal precisa de mais presenca.
const GRANDE = "h-11 px-5 text-[15px]";

const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;
const TEM_DEMO = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

const REPO = "https://github.com/MatheusMorais1234/freelamanager";

const RECURSOS = [
  {
    icone: Users,
    titulo: "Clientes completos",
    texto:
      "Pessoa física ou jurídica, CPF e CNPJ validados, endereço preenchido pelo CEP e a ficha com tudo que cada cliente já pagou, ainda deve e está em atraso.",
  },
  {
    icone: FileText,
    titulo: "Contratos com status",
    texto:
      "Valor, prazo e situação de cada trabalho — pendente, em andamento, concluído ou cancelado — com aviso de prazo vencendo.",
  },
  {
    icone: CalendarClock,
    titulo: "Parcelas e atrasos",
    texto:
      "Divida o contrato em até 60 parcelas, dê baixa com um clique e veja na hora o que foi recebido, o que falta e o que venceu.",
  },
  {
    icone: BarChart3,
    titulo: "Relatórios por período",
    texto:
      "Faturamento mês a mês, quebra por cliente e por forma de recebimento, com exportação em CSV para o seu contador.",
  },
];

const PASSOS = [
  ["Cadastre o cliente", "Digite o CEP e o endereço se preenche sozinho."],
  ["Crie o contrato", "Defina valor, prazo e em quantas parcelas ele vai ser pago."],
  ["Acompanhe o dinheiro", "O painel mostra o que entrou, o que falta e o que atrasou."],
];

function BotaoDemo({ className, size = "lg" }) {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  if (!TEM_DEMO) return null;

  async function entrar() {
    setErro("");
    setEntrando(true);
    try {
      await login(DEMO_EMAIL, DEMO_PASSWORD);
      navigate("/", { replace: true });
    } catch (err) {
      setErro(err.message);
      setEntrando(false);
    }
  }

  return (
    <div className={className}>
      <Button size={size} onClick={entrar} disabled={entrando} className={cn(GRANDE, "gap-2")}>
        {entrando ? <Loader2 className="size-4 animate-spin" /> : <PlayCircle className="size-4" />}
        Testar a demonstração
      </Button>
      {erro && <p className="mt-2 text-sm text-destructive">{erro}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="auth-bg min-h-svh text-foreground">
      {/* ---------- topo ---------- */}
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-5 sm:px-6">
        <Brand />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link to="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/register">Criar conta grátis</Link>
          </Button>
        </nav>
      </header>

      <main>
        {/* ---------- hero ---------- */}
        <section className="mx-auto max-w-6xl px-4 pt-10 pb-14 text-center sm:px-6 sm:pt-16">
          <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            Gratuito e de código aberto
          </p>
          <h1 className="mx-auto max-w-3xl text-4xl leading-[1.08] font-bold tracking-tight text-balance sm:text-5xl lg:text-6xl">
            Seus clientes, contratos e recebimentos{" "}
            <span className="text-primary">num lugar só</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-pretty text-muted-foreground sm:text-lg">
            O FreelaManager é para quem trabalha por conta própria e cansou de controlar
            cliente em planilha e cobrança na memória. Veja quem pagou, quem está devendo
            e quanto ainda vai entrar no mês.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BotaoDemo />
            <Button asChild size="lg" variant="outline" className={cn(GRANDE, "gap-2")}>
              <Link to="/register">
                Criar conta grátis <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          {TEM_DEMO && (
            <p className="mt-3 text-xs text-muted-foreground">
              A demonstração entra direto, com dados de exemplo. Sem cadastro.
            </p>
          )}

          {/* print do painel, numa moldura de navegador */}
          <figure className="mx-auto mt-14 max-w-5xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl shadow-black/30">
            <div className="flex items-center gap-1.5 border-b border-border px-4 py-2.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="size-2.5 rounded-full bg-muted-foreground/30" />
              <span className="ml-3 truncate rounded bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">
                app.matheusmorais.com
              </span>
            </div>
            <img
              src="/landing/painel.jpg"
              alt="Painel do FreelaManager com total de clientes, contratos, valores a receber e recebidos, gráfico de contratos por status e de faturamento mensal"
              width="1600"
              height="900"
              className="block h-auto w-full"
            />
          </figure>
        </section>

        {/* ---------- recursos ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="recursos-h">
          <h2 id="recursos-h" className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            O que dá para fazer
          </h2>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {RECURSOS.map(({ icone: Icone, titulo, texto }) => (
              <li key={titulo} className="rounded-xl border border-border bg-card p-5">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary">
                  <Icone className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold">{titulo}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---------- como funciona ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6" aria-labelledby="passos-h">
          <h2 id="passos-h" className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
            Como funciona
          </h2>
          <ol className="mx-auto mt-10 grid max-w-4xl gap-6 sm:grid-cols-3">
            {PASSOS.map(([titulo, texto], i) => (
              <li key={titulo} className="text-center">
                <span className="mx-auto grid size-10 place-items-center rounded-full border border-primary/40 font-semibold text-primary">
                  {i + 1}
                </span>
                <h3 className="mt-3 font-semibold">{titulo}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{texto}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- codigo aberto ---------- */}
        <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="flex flex-col items-start gap-6 rounded-2xl border border-border bg-card p-6 sm:p-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="flex items-center gap-2 text-sm font-medium text-primary">
                <ShieldCheck className="size-4" aria-hidden="true" /> Código aberto
              </p>
              <h2 className="mt-2 text-xl font-bold tracking-tight sm:text-2xl">
                Dá para ler cada linha
              </h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                React e Vite no front, API em Express com autenticação JWT, PostgreSQL com
                Prisma e 95 testes automatizados rodando a cada alteração. Os dados de cada
                usuário são isolados em toda consulta.
              </p>
            </div>
            <Button asChild variant="outline" size="lg" className={cn(GRANDE, "shrink-0 gap-2")}>
              <a href={REPO} target="_blank" rel="noopener noreferrer">
                <FolderGit2 className="size-4" /> Ver no GitHub
              </a>
            </Button>
          </div>
        </section>

        {/* ---------- chamada final ---------- */}
        <section className="mx-auto max-w-3xl px-4 pt-6 pb-20 text-center sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Pare de cobrar de cabeça
          </h2>
          <p className="mt-3 text-muted-foreground">
            Teste com dados de exemplo agora, ou crie a sua conta e cadastre o primeiro cliente.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <BotaoDemo />
            <Button asChild size="lg" variant="outline" className={GRANDE}>
              <Link to="/register">Criar conta grátis</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <p>
            Feito por{" "}
            <a href="https://matheusmorais.com" className="font-medium text-foreground hover:text-primary">
              Matheus Morais
            </a>
            , desenvolvedor full-stack.
          </p>
          <div className="flex items-center gap-5">
            <a href={REPO} target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              GitHub
            </a>
            <a href="https://matheusmorais.com" className="hover:text-foreground">
              Portfólio
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
