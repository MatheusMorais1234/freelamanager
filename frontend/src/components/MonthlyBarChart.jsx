// ============================================================
// MonthlyBarChart - barras de faturamento mes a mes
// ------------------------------------------------------------
// POR QUE EXISTE: o grafico do painel e o do relatorio eram
// trinta linhas identicas de Recharts; mudavam so a cor da barra
// e o rotulo do tooltip.
//
// E ganhou o que faltava nos dois: ESTADO VAZIO. Sem dados, o
// painel desenhava eixos vazios - uma moldura sem nada dentro,
// que o usuario le como "quebrou" e nao como "ainda nao ha
// recebimentos". O grafico de rosca ao lado ja mostrava um
// EmptyState; agora os dois se comportam igual.
// ============================================================

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";

import { formatMoney, formatMoneyShort } from "@/lib/format.js";
import { EmptyState } from "@/components/States.jsx";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart.jsx";

/**
 * @param {Array}  data   [{ label: "mar", total: 1234 }]
 * @param {string} color  cor CSS da barra (ex.: "var(--chart-1)")
 * @param {string} label  nome da serie no tooltip
 */
export function MonthlyBarChart({ data = [], color = "var(--chart-1)", label = "Total" }) {
  // Mes zerado nao e ausencia de dado: so consideramos vazio
  // quando nao ha NENHUM valor a mostrar no periodo.
  const vazio = data.length === 0 || data.every((d) => Number(d.total ?? 0) === 0);

  if (vazio) {
    return (
      <EmptyState
        icon={BarChart3}
        title="Sem faturamento no período"
        description="Os meses aparecem aqui assim que houver pagamentos recebidos."
      />
    );
  }

  return (
    <ChartContainer
      config={{ total: { label, color } }}
      className="h-64 w-full"
    >
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
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
        <Bar dataKey="total" fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export default MonthlyBarChart;
