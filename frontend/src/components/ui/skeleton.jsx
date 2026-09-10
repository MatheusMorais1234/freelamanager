import { cn } from "@/lib/utils"

// O padrao do shadcn e "bg-muted", mas nesta paleta --muted no
// tema claro e oklch(0.96) e o cartao onde ele aparece e branco:
// da 1.12:1 de diferenca, ou seja, o esqueleto de carregamento
// fica praticamente invisivel.
//
// A correcao NAO e escurecer --muted: esse token tambem pinta
// avatar, rodape de tabela, barra de progresso, hover de botao e
// fundo de aba - mexer nele repintaria o app inteiro para
// resolver um problema de um componente so.
//
// "bg-foreground/10" resolve no lugar certo e de quebra funciona
// nos dois temas com um valor unico, porque --foreground ja vira
// junto com o tema: 1.22:1 no claro e 1.30:1 no escuro, contra
// 1.12:1 e 1.14:1 de antes.
function Skeleton({
  className,
  ...props
}) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-foreground/10", className)}
      {...props} />
  );
}

export { Skeleton }
