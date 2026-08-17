import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";
import {
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
import StatusBadge, { STATUS_STYLE } from "@/components/StatusBadge.jsx";
import { CardsSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/States.jsx";

import { Button } from "@/components/ui/button.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
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

function StatCard({ icon: Icon, label, value, hint, tone = "default" }) {
  const toneClass = {
    default: "text-foreground",
    primary: "text-primary",
    success: "text-success",
  }[tone];

  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 py-5">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {label}
          </p>
          <p className={`tabular mt-2 truncate text-2xl font-semibold ${toneClass}`}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // useCallback para a funcao nao ser recriada a cada render e
  // poder entrar como dependencia do useEffect com seguranca.
  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // Promise.all dispara as duas chamadas EM PARALELO.
      // Uma depois da outra levaria o dobro do tempo.
      const [s, c] = await Promise.all([
        api.get("/contracts/stats"),
        api.get("/contracts"),
      ]);
      setStats(s.stats);
      setContracts(c.contracts);
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

  // Faturamento dos ultimos 6 meses, contando so o que foi
  // concluido - contrato pendente ainda nao virou receita.
  const monthlyData = useMemo(() => {
    const months = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
        total: 0,
      });
    }

    for (const c of contracts) {
      if (c.status !== "COMPLETED") continue;
      const d = new Date(c.createdAt);
      const bucket = months.find((m) => m.key === `${d.getFullYear()}-${d.getMonth()}`);
      if (bucket) bucket.total += Number(c.amount);
    }

    return months;
  }, [contracts]);

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

  const aReceber =
    Number(stats.byStatus.PENDING.total) + Number(stats.byStatus.ACTIVE.total);
  const recebido = Number(stats.byStatus.COMPLETED.total);
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
          hint={`${stats.byStatus.PENDING.count + stats.byStatus.ACTIVE.count} em aberto`}
          tone="primary"
        />
        <StatCard
          icon={TrendingUp}
          label="Recebido"
          value={formatMoney(recebido)}
          hint={`${stats.byStatus.COMPLETED.count} concluído(s)`}
          tone="success"
        />
      </section>

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
              Contratos concluídos nos últimos 6 meses
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

      {/* ---------- Prazos proximos ---------- */}
      {upcoming.length > 0 && (
        <Card className="mt-4">
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
