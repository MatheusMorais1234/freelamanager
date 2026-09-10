// ============================================================
// Relatorios - o fechamento de um periodo
// ------------------------------------------------------------
// O painel responde "como esta o negocio hoje". Esta tela
// responde "o que aconteceu entre duas datas" - que e o que se
// leva para o contador no fim do mes, ou o que responde "quais
// clientes realmente pagam".
//
// A exportacao em CSV existe porque, na pratica, o proximo
// destino desse numero e uma planilha.
// ============================================================

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  CalendarRange,
  Download,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { api } from "@/lib/api.js";
import { useApiData } from "@/hooks/useApiData.js";
import { formatMoney, formatDate, PAYMENT_METHOD_LABEL } from "@/lib/format.js";
import { baixarCSV, paraCSV } from "@/lib/csv.js";
import StatCard from "@/components/StatCard.jsx";
import MonthlyBarChart from "@/components/MonthlyBarChart.jsx";
import { CardsSkeleton, EmptyState, ErrorState, PageHeader } from "@/components/States.jsx";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Skeleton } from "@/components/ui/skeleton.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.jsx";

/** Data em "AAAA-MM-DD", que e o formato do <input type="date">. */
function iso(date) {
  return date.toISOString().slice(0, 10);
}

// Atalhos de periodo. Digitar duas datas para ver "este mes" e
// trabalho que o sistema pode poupar.
function atalhos() {
  const hoje = new Date();
  const ano = hoje.getFullYear();
  const mes = hoje.getMonth();

  return [
    {
      label: "Este mês",
      from: iso(new Date(ano, mes, 1)),
      to: iso(new Date(ano, mes + 1, 0)),
    },
    {
      label: "Mês passado",
      from: iso(new Date(ano, mes - 1, 1)),
      to: iso(new Date(ano, mes, 0)),
    },
    {
      label: "Últimos 3 meses",
      from: iso(new Date(ano, mes - 2, 1)),
      to: iso(new Date(ano, mes + 1, 0)),
    },
    { label: "Este ano", from: iso(new Date(ano, 0, 1)), to: iso(new Date(ano, 11, 31)) },
  ];
}

const ATALHOS = atalhos();

export default function Reports() {
  const inicial = ATALHOS[0];

  const [from, setFrom] = useState(inicial.from);
  const [to, setTo] = useState(inicial.to);
  const buscar = useCallback(async () => {
    const { report: data } = await api.get(`/reports?from=${from}&to=${to}`);

    // O backend conserta datas invertidas; a tela precisa
    // acompanhar, senao os campos mostrariam uma coisa e o
    // relatorio abaixo mostraria outra. Mudar from/to dispara
    // outra busca - que ja vem sem "swapped" e encerra a ida e
    // volta.
    if (data.period.swapped) {
      setFrom(data.period.from);
      setTo(data.period.to);
      toast.info("As datas estavam invertidas e foram trocadas.");
    }

    return data;
  }, [from, to]);

  // Aqui o array de dependencias importa de verdade: trocar o
  // periodo refaz a busca, e o hook descarta a resposta da
  // consulta anterior se ela chegar atrasada.
  const { data: report, loading, error, reload } = useApiData(buscar, [from, to]);

  const monthlyData = useMemo(() => {
    if (!report) return [];

    return report.monthly.map((m) => {
      const [ano, mes] = m.key.split("-").map(Number);
      const d = new Date(ano, mes - 1, 1);

      return {
        key: m.key,
        label: d
          .toLocaleDateString("pt-BR", { month: "short", year: "2-digit" })
          .replace(".", ""),
        total: Number(m.total),
      };
    });
  }, [report]);

  function aplicarAtalho(a) {
    setFrom(a.from);
    setTo(a.to);
  }

  // ---------- Exportacao ----------
  function exportarClientes() {
    const linhas = report.byClient.map((c) => ({
      Cliente: c.name,
      Empresa: c.company || "",
      Contratos: c.contracts,
      Recebido: c.received,
      "A receber": c.pending,
      Atrasado: c.overdue,
    }));

    baixarCSV(`freelamanager-clientes-${from}-a-${to}.csv`, paraCSV(linhas));
    toast.success("Relatório exportado.");
  }

  function exportarFormas() {
    const linhas = report.byMethod.map((m) => ({
      Forma: PAYMENT_METHOD_LABEL[m.method] || m.method,
      Recebimentos: m.count,
      Total: m.total,
    }));

    baixarCSV(`freelamanager-formas-${from}-a-${to}.csv`, paraCSV(linhas));
    toast.success("Relatório exportado.");
  }

  const semDados =
    report &&
    Number(report.totals.received.total) === 0 &&
    Number(report.totals.pending.total) === 0 &&
    Number(report.totals.overdue.total) === 0;

  return (
    <>
      <PageHeader
        title="Relatórios"
        description="O fechamento de um período: o que entrou, o que falta entrar e de quem."
      >
        <Button
          variant="outline"
          className="gap-2"
          onClick={exportarClientes}
          disabled={loading || !report || report.byClient.length === 0}
        >
          <Download className="size-4" />
          Exportar CSV
        </Button>
      </PageHeader>

      {/* ---------------- Seletor de periodo ---------------- */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-4 py-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="from">De</Label>
              <Input
                id="from"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="to">Até</Label>
              <Input
                id="to"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="w-40"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {ATALHOS.map((a) => {
              const ativo = a.from === from && a.to === to;
              return (
                <Button
                  key={a.label}
                  variant={ativo ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => aplicarAtalho(a)}
                >
                  {a.label}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading || !report ? (
        <>
          <CardsSkeleton count={3} />
          <Skeleton className="mt-4 h-72 rounded-xl" />
        </>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <StatCard
              icon={TrendingUp}
              label="Recebido"
              value={formatMoney(report.totals.received.total)}
              hint={`${report.totals.received.count} recebimento(s)`}
              tone="success"
            />
            <StatCard
              icon={Wallet}
              label="A receber"
              value={formatMoney(report.totals.pending.total)}
              hint={`${report.totals.pending.count} parcela(s) a vencer`}
              tone="primary"
            />
            <StatCard
              icon={AlertCircle}
              label="Em atraso"
              value={formatMoney(report.totals.overdue.total)}
              hint={`${report.totals.overdue.count} parcela(s) vencida(s)`}
              tone={Number(report.totals.overdue.total) > 0 ? "destructive" : "default"}
            />
          </section>

          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarRange className="size-3.5" />
            Período de {formatDate(report.period.from)} a {formatDate(report.period.to)}.
            O recebido conta pela data do pagamento; o restante, pelo vencimento.
          </p>

          {semDados ? (
            <Card className="mt-4">
              <EmptyState
                icon={CalendarRange}
                title="Nada neste período"
                description="Não há recebimentos nem parcelas com vencimento entre essas datas. Experimente um período maior."
              />
            </Card>
          ) : (
            <>
              {/* ---------------- Faturamento no periodo ---------------- */}
              {monthlyData.length > 0 && (
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-base">Recebido mês a mês</CardTitle>
                    <CardDescription>
                      Somente pagamentos que entraram no período
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <MonthlyBarChart
                      data={monthlyData}
                      color="var(--chart-3)"
                      label="Recebido"
                    />
                  </CardContent>
                </Card>
              )}

              {/* ---------------- Por cliente ---------------- */}
              <Card className="mt-4 overflow-hidden">
                <CardHeader className="flex-row items-center justify-between space-y-0">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Users className="size-4 text-primary" />
                      Por cliente
                    </CardTitle>
                    <CardDescription>Quem mais pagou primeiro</CardDescription>
                  </div>
                  {report.byClient.length > 0 && (
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={exportarClientes}>
                      <Download className="size-3.5" />
                      CSV
                    </Button>
                  )}
                </CardHeader>

                {report.byClient.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="Nenhum cliente movimentou neste período"
                    description="Nada foi recebido nem venceu entre essas datas."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead className="text-center">Contratos</TableHead>
                          <TableHead className="text-right">Recebido</TableHead>
                          <TableHead className="text-right">A receber</TableHead>
                          <TableHead className="text-right">Atrasado</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.byClient.map((c) => (
                          <TableRow key={c.id}>
                            <TableCell>
                              <p className="font-medium">{c.name}</p>
                              {c.company && (
                                <p className="text-xs text-muted-foreground">{c.company}</p>
                              )}
                            </TableCell>
                            <TableCell className="tabular text-center text-muted-foreground">
                              {c.contracts}
                            </TableCell>
                            <TableCell className="tabular text-right font-medium text-success">
                              {formatMoney(c.received)}
                            </TableCell>
                            <TableCell className="tabular text-right text-muted-foreground">
                              {formatMoney(c.pending)}
                            </TableCell>
                            <TableCell
                              className={`tabular text-right ${
                                Number(c.overdue) > 0
                                  ? "font-medium text-destructive"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {formatMoney(c.overdue)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>

                      {/* Rodape com o total: a tabela precisa
                          fechar a conta na propria tela, e nao
                          obrigar quem le a somar de cabeca. */}
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2} className="font-medium">
                            Total
                          </TableCell>
                          <TableCell className="tabular text-right font-semibold text-success">
                            {formatMoney(report.totals.received.total)}
                          </TableCell>
                          <TableCell className="tabular text-right font-semibold">
                            {formatMoney(report.totals.pending.total)}
                          </TableCell>
                          <TableCell className="tabular text-right font-semibold">
                            {formatMoney(report.totals.overdue.total)}
                          </TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </Card>

              {/* ---------------- Por forma de recebimento ---------------- */}
              {report.byMethod.length > 0 && (
                <Card className="mt-4">
                  <CardHeader className="flex-row items-center justify-between space-y-0">
                    <div className="space-y-1.5">
                      <CardTitle className="text-base">Como o dinheiro entrou</CardTitle>
                      <CardDescription>
                        Formas de recebimento no período
                      </CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" className="gap-1.5" onClick={exportarFormas}>
                      <Download className="size-3.5" />
                      CSV
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {report.byMethod.map((m) => {
                      const total = Number(report.totals.received.total);
                      const fatia = total > 0 ? (Number(m.total) / total) * 100 : 0;

                      return (
                        <div key={m.method} className="rounded-lg border px-3 py-2.5">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-medium">
                              {PAYMENT_METHOD_LABEL[m.method] || m.method}
                            </span>
                            <span className="tabular text-sm">
                              {formatMoney(m.total)}
                              <span className="ml-2 text-xs text-muted-foreground">
                                {fatia.toFixed(0)}%
                              </span>
                            </span>
                          </div>
                          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${fatia}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground">
                            {m.count} recebimento(s)
                          </p>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </>
  );
}
