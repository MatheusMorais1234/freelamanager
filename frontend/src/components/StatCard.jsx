// ============================================================
// StatCard - cartao de indicador (rotulo, numero grande, apoio)
// ------------------------------------------------------------
// POR QUE EXISTE: havia TRES implementacoes divergentes do
// mesmo cartao:
//   - Dashboard: com o "rail" (fio de cor no topo) e sem o tom
//     destrutivo;
//   - Reports: com o tom destrutivo e sem o rail;
//   - Payments: tingia so o numero e deixava o icone sempre
//     cinza, entao o cartao de "atrasado" nao se distinguia do
//     de "recebido" numa olhada rapida.
//
// Aqui o tom tinge NUMERO e ICONE juntos, sempre - e o rail
// virou opcional (prop "rail"), porque o painel usa e as outras
// telas nao.
//
// Cor de TEXTO usa os tokens *-emphasis: a cor cheia da marca
// tem contraste suficiente para um bloco (fundo, barra), mas
// nao para texto pequeno. Cor de FUNDO continua com a cor cheia
// em opacidade baixa (bg-primary/10).
// ============================================================

import { Card, CardContent } from "@/components/ui/card.jsx";
import { FieldLabel } from "@/components/States.jsx";
import { cn } from "@/lib/utils.js";

const TONES = {
  default: {
    value: "text-foreground",
    icon: "bg-muted text-muted-foreground",
    rail: "bg-border",
  },
  primary: {
    value: "text-primary-emphasis",
    icon: "bg-primary/10 text-primary-emphasis",
    rail: "bg-primary",
  },
  success: {
    value: "text-success-emphasis",
    icon: "bg-success/10 text-success-emphasis",
    rail: "bg-success",
  },
  destructive: {
    // "destructive" ja e uma cor de alerta, pensada para leitura
    // direta - nao precisa de variante de enfase.
    value: "text-destructive",
    icon: "bg-destructive/10 text-destructive",
    rail: "bg-destructive",
  },
};

/**
 * @param {Component} icon   componente de icone (lucide-react)
 * @param {string}    label
 * @param {ReactNode} value
 * @param {ReactNode} hint   linha de apoio abaixo do numero
 * @param {"default"|"primary"|"success"|"destructive"} tone
 * @param {boolean}   rail   fio de cor no topo do cartao
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  rail = false,
}) {
  const t = TONES[tone] ?? TONES.default;

  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      {rail && (
        // Destaque sem gritar: um fio de 2px no topo.
        // aria-hidden porque e enfeite - o rotulo ja diz o que e.
        <span
          className={cn("absolute inset-x-0 top-0 h-0.5", t.rail)}
          aria-hidden="true"
        />
      )}

      <CardContent className="flex items-start justify-between gap-3 py-5">
        <div className="min-w-0">
          <FieldLabel>{label}</FieldLabel>
          <p className={cn("tabular mt-2 truncate text-2xl font-semibold", t.value)}>
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span
            className={cn("grid size-9 shrink-0 place-items-center rounded-lg", t.icon)}
          >
            <Icon className="size-4" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

export default StatCard;
