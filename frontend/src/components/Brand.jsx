// ============================================================
// Marca do produto
// ------------------------------------------------------------
// O simbolo e um SVG inline (e nao um <img>) por dois motivos:
//   1. herda a cor do tema, entao acompanha qualquer mudanca
//      de paleta sem precisar de outro arquivo;
//   2. nao gera uma segunda requisicao de rede.
//
// Quando a logo definitiva ficar pronta, basta trocar o
// conteudo de <BrandMark> - nenhuma tela precisa mudar.
// ============================================================

import { cn } from "@/lib/utils.js";

export function BrandMark({ className }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm",
        "size-9",
        className
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" fill="none" className="size-5">
        {/* Duas folhas empilhadas sugerindo contratos organizados,
            com a barra do "F" atravessando a de cima. */}
        <path
          d="M5 8.5A2.5 2.5 0 0 1 7.5 6h9A2.5 2.5 0 0 1 19 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 5 17.5v-9Z"
          fill="currentColor"
          opacity="0.28"
        />
        <path
          d="M8 4.5A2.5 2.5 0 0 1 10.5 2h6A2.5 2.5 0 0 1 19 4.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <path
          d="M9.5 11.5h6M9.5 15h3.5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export default function Brand({ size = "md", className }) {
  const large = size === "lg";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark className={large ? "size-11 rounded-xl" : undefined} />
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
