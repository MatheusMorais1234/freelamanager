// ============================================================
// Marca do produto
// ------------------------------------------------------------
// O simbolo e um SVG inline (e nao um <img>) para nao gerar uma
// segunda requisicao de rede e ficar nitido em qualquer tamanho.
//
// Desenho: uma pasta (os contratos organizados) com uma seta de
// crescimento (o dinheiro entrando). As cores sao as da marca e
// nao as do tema: o simbolo e o mesmo no claro e no escuro, como
// o favicon (public/favicon.svg, mesmo desenho).
// ============================================================

import { cn } from "@/lib/utils.js";

const AMBAR = "#F0A425";
const TINTA = "#131116";

export function BrandMark({ className }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-9 shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="5.5" fill={AMBAR} />
      {/* aba e fundo da pasta */}
      <path
        fill={TINTA}
        d="M5.93 6.8V5.56A1 1 0 0 1 6.93 4.56H12.1L13.1 6.25H19.6L20.3 7.26H10.8Z"
      />
      {/* frente da pasta */}
      <path
        fill={TINTA}
        d="M3.65 8.15A1.8 1.8 0 0 1 5.45 6.35H10.1L11.46 8.14H19.42A1 1 0 0 1 20.42 9.14V17.57A1.8 1.8 0 0 1 18.62 19.37H5.45A1.8 1.8 0 0 1 3.65 17.57Z"
      />
      {/* seta de crescimento */}
      <path
        fill="none"
        stroke={AMBAR}
        strokeWidth="1.45"
        d="M6.3 16.4 9.6 13.85 11.55 15.55 16.1 11.75"
      />
      <path fill={AMBAR} d="M18.45 9.5 14.9 10.5 17.35 12.95Z" />
    </svg>
  );
}

export default function Brand({ size = "md", className }) {
  const large = size === "lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={large ? "size-11" : undefined} />
      <span
        className={cn(
          "font-semibold tracking-tight",
          large ? "text-xl" : "text-[15px]"
        )}
      >
        Freela<span className="text-primary">Manager</span>
      </span>
    </div>
  );
}
