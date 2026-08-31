import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
  AlertCircle,
  ArrowRight,
  CalendarClock,
  FileText,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api.js";
import { useAuth } from "@/context/AuthContext.jsx";
import {
  formatMoney,
  formatMoneyShort,
  formatDate,
  daysUntil,
  STATUS_LABEL,
  STATUS_LIST,
} from "@/lib/format.js";
import StatusBadge, {
  PaymentStatusBadge,
  STATUS_STYLE,
} from "@/components/StatusBadge.jsx";
import { CardsSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/States.jsx";

import { Button } from "@/components/ui/button.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

// Cartao de indicador do topo do painel.
// O "tone" tinge numero, icone e o fio de cor da borda superior
// ao mesmo tempo - assim a leitura do cartao e imediata, sem
// precisar ler o rotulo para saber se e dinheiro que entrou ou
// dinheiro que falta entrar.
const STAT_TONE = {
  default: {
    value: "text-foreground",
    icon: "bg-muted text-muted-foreground",
    rail: "bg-border",
  },
  primary: {
    value: "text-primary",
    icon: "bg-primary/12 text-primary",
    rail: "bg-primary",
  },
  success: {
    value: "text-success",
    icon: "bg-success/12 text-success",
    rail: "bg-success",
  },
};

function StatCard({ icon: Icon, label, value, hint, tone = "default" }) {
  const t = STAT_TONE[tone];

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      {/* Fio de cor no topo: destaque sem gritar */}
      <span className={`absolute inset-x-0 top-0 h-0.5 ${t.rail}`} aria-hidden="true" />

      <CardContent className="flex items-start justify-between gap-3 py-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className={`tabular mt-2 truncate text-2xl font-semibold ${t.value}`}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${t.icon}`}>
          <Icon className="size-4" />
        </span>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [summary, setSummary] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // useCallback para a funcao nao ser recriada a cada render e
  // poder entrar como dependencia do useEffect com seguranca.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Promise.all dispara as chamadas EM PARALELO.
      // Uma depois da outra levaria o dobro do tempo.
      const [s, c, sum, p] = await Promise.all([
        api.get("/contracts/stats"),
        api.get("/contracts"),
        api.get("/payments/summary"),
        api.get("/payments"),
      ]);
      setStats(s.stats);
      setContracts(c.contracts);
      setSummary(sum.summary);
      setPayments(p.payments);
    } catch (err) {
      // Sem este catch, uma API fora do ar deixaria "stats" em
      // null e a tela quebraria ao ler stats.byStatus.
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // useMemo: estes calculos so refazem quando os dados mudam,
  // nao a cada re-render provocado por outra coisa.
  const donutData = useMemo(() => {
    if (!stats) return [];
    return STATUS_LIST.map((s) => ({
      status: s,
      label: STATUS_LABEL[s],
      count: stats.byStatus[s].count,
      fill: STATUS_STYLE[s].chart,
    })).filter((d) => d.count > 0);
  }, [stats]);

  // Faturamento dos ultimos 6 meses. A soma vem PRONTA do
  // backend (/payments/summary), agrupada pela data em que cada
  // parcela foi recebida - dinheiro que entrou de verdade, e nao
  // contrato marcado como concluido.
  const monthlyData = useMemo(() => {
    if (!summary) return [];

    return summary.monthly.map((m) => {
      // "2026-08" -> objeto Date -> "ago"
      const [year, month] = m.key.split("-").map(Number);
      const d = new Date(year, month - 1, 1);

      return {
        key: m.key,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        total: Number(m.total),
      };
    });
  }, [summary]);

  // As proximas parcelas a receber, atrasadas primeiro. A lista
  // ja vem do backend ordenada por vencimento; aqui so tiramos
  // as recebidas e cortamos nas cinco primeiras.
  const upcomingPayments = useMemo(
    () => payments.filter((p) => p.status !== "PAID").slice(0, 5),
    [payments]
  );

  // Prazos que vencem nos proximos 30 dias ou ja venceram,
  // ignorando o que ja foi concluido ou cancelado.
  const upcoming = useMemo(() => {
    return contracts
      .filter((c) => c.dueDate && (c.status === "PENDING" || c.status === "ACTIVE"))
      .map((c) => ({ ...c, days: daysUntil(c.dueDate) }))
      .filter((c) => c.days <= 30)
      .sort((a, b) => a.days - b.days)
      .slice(0, 5);
  }, [contracts]);

  if (loading) {
    return (
      <>
        <PageHeader title="Painel" description="Carregando seus dados..." />
        <CardsSkeleton />
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Painel" />
        <ErrorState message={error} onRetry={load} />
      </>
    );
  }

  // Dinheiro agora vem dos PAGAMENTOS, nao do status do
  // contrato: um contrato "em andamento" pode ja ter metade
  // paga, e um "concluido" pode nao ter recebido nada ainda.
  const recebido = Number(summary.paid.total);
  const aReceber = Number(summary.pending.total) + Number(summary.overdue.total);
  const atrasado = Number(summary.overdue.total);
  const firstName = user?.name?.split(" ")[0];

  return (
    <>
      <PageHeader
        title={`Olá, ${firstName}`}
        description="Um resumo do seu negócio hoje."
      >
        <Button asChild variant="outline">
          <Link to="/contracts">
            Ver contratos
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </PageHeader>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Clientes" value={stats.totalClients} />
        <StatCard icon={FileText} label="Contratos" value={stats.totalContracts} />
        <StatCard
          icon={Wallet}
          label="A receber"
          value={formatMoney(aReceber)}
          hint={`${summary.pending.count + summary.overdue.count} parcela(s) em aberto`}
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Recebido"
          value={formatMoney(recebido)}
          hint={`${summary.paid.count} parcela(s) paga(s)`}
          tone="success"
        />
      </section>

      {/* Atraso e a unica coisa do painel que pede acao imediata,
          entao ganha destaque proprio em vez de virar mais um
          numero no meio dos outros. */}
      {atrasado > 0 && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="size-4" />
          <AlertDescription className="flex flex-wrap items-center gap-x-2">
            <span>
              <strong className="tabular">{formatMoney(atrasado)}</strong> em{" "}
              {summary.overdue.count} parcela(s) vencida(s).
            </span>
            <Link to="/payments" className="font-medium underline underline-offset-4">
              Ver pagamentos
            </Link>
          </AlertDescription>
        </Alert>
      )}

      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        {/* ---------- Rosca por status ---------- */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Contratos por status</CardTitle>
            <CardDescription>Distribuição da sua carteira</CardDescription>
          </CardHeader>
          <CardContent>
            {donutData.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Nada para mostrar"
                description="Os gráficos aparecem assim que você cadastrar contratos."
              />
            ) : (
              <>
                <ChartContainer
                  config={{ count: { label: "Contratos" } }}
                  className="mx-auto aspect-square max-h-56"
                >
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="label" />} />
                    <Pie
                      data={donutData}
                      dataKey="count"
                      nameKey="label"
                      innerRadius="55%"
                      outerRadius="85%"
                      strokeWidth={2}
                      stroke="var(--card)"
                    >
                      {donutData.map((d) => (
                        <Cell key={d.status} fill={d.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <ul className="mt-2 space-y-2">
                  {STATUS_LIST.map((s) => (
                    <li key={s} className="flex items-center justify-between gap-3 text-sm">
                      <StatusBadge status={s} />
                      <span className="text-muted-foreground">
                        <span className="tabular font-medium text-foreground">
                          {stats.byStatus[s].count}
                        </span>
                        {" · "}
                        <span className="tabular">
                          {formatMoney(stats.byStatus[s].total)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </CardContent>
        </Card>

        {/* ---------- Faturamento mensal ---------- */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="text-base">Faturamento</CardTitle>
            <CardDescription>
              Pagamentos recebidos nos últimos 6 meses
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{ total: { label: "Faturado", color: "var(--chart-1)" } }}
              className="h-64 w-full"
            >
              <BarChart data={monthlyData} margin={{ left: 4, right: 4 }}>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={formatMoneyShort}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                  content={
                    <ChartTooltipContent
                      formatter={(value) => formatMoney(value)}
                      indicator="line"
                    />
                  }
                />
                <Bar dataKey="total" fill="var(--chart-1)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>

      {/* ---------- O que precisa de atencao ---------- */}
      {/* Duas listas lado a lado, porque sao coisas diferentes:
          uma cobra ENTREGA (prazo do contrato), a outra cobra
          DINHEIRO (vencimento da parcela). */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
      {upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-primary" />
              Prazos próximos
            </CardTitle>
            <CardDescription>Vencendo em até 30 dias</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {c.client.name}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tabular text-sm">{formatDate(c.dueDate)}</p>
                  <p
                    className={
                      c.days < 0
                        ? "text-xs font-medium text-destructive"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {c.days < 0
                      ? `${Math.abs(c.days)} dia(s) em atraso`
                      : c.days === 0
                        ? "vence hoje"
                        : `em ${c.days} dia(s)`}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {upcomingPayments.length > 0 && (
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Wallet className="size-4 text-primary" />
                Próximos recebimentos
              </CardTitle>
              <CardDescription>Parcelas em aberto, vencendo primeiro</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link to="/payments">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcomingPayments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {p.description || "Parcela"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.contract.client.name} · {p.contract.title}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="text-right">
                    <p className="tabular text-sm font-medium">
                      {formatMoney(p.amount)}
                    </p>
                    <p className="tabular text-xs text-muted-foreground">
                      {formatDate(p.dueDate)}
                    </p>
                  </div>
                  <PaymentStatusBadge status={p.status} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      </section>

      {/* ---------- Contratos recentes ---------- */}
      <Card className="mt-4 overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Contratos recentes</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link to="/contracts">Ver todos</Link>
          </Button>
        </CardHeader>

        {contracts.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhum contrato ainda"
            description="Cadastre um cliente e registre seu primeiro contrato."
          >
            <Button asChild>
              <Link to="/contracts">Criar o primeiro</Link>
            </Button>
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.slice(0, 5).map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.client.name}
                    </TableCell>
                    <TableCell className="tabular text-right">
                      {formatMoney(c.amount)}
                    </TableCell>
                    <TableCell className="tabular text-muted-foreground">
                      {formatDate(c.dueDate)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={c.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}
