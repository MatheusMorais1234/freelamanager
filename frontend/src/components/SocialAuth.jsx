// ============================================================
// Botoes de entrada com Google / Facebook - DEMONSTRACAO
// ------------------------------------------------------------
// IMPORTANTE: nao ha OAuth por tras destes botoes. Eles existem
// para mostrar como a tela ficaria com login social e estao
// DESABILITADOS e marcados como "em breve" de proposito.
//
// Um botao que parece funcionar mas nao funciona e pior do que
// nao ter botao: o usuario tenta, nao entende o que aconteceu e
// desconfia do sistema. Pior ainda seria um que abrisse um
// formulario pedindo a senha do Google - isso e exatamente a
// aparencia de uma pagina de phishing.
//
// Quando o OAuth de verdade for implementado, basta remover o
// "disabled" e ligar o onClick ao fluxo de redirecionamento.
// ============================================================

import { Button } from "@/components/ui/button.jsx";
import { Separator } from "@/components/ui/separator.jsx";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.26-2.09 3.56-5.17 3.56-8.87Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.94-2.91l-3.87-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.28v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.28a12 12 0 0 0 0 10.76l3.99-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.28 6.62l3.99 3.09C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.96h-1.51c-1.49 0-1.96.93-1.96 1.89v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07Z"
      />
    </svg>
  );
}

export default function SocialAuth() {
  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          type="button"
          variant="outline"
          disabled
          className="gap-2"
          // O title aparece ao passar o mouse e explica o porque
          // de o botao estar apagado.
          title="Login social ainda não disponível"
        >
          <GoogleIcon />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled
          className="gap-2"
          title="Login social ainda não disponível"
        >
          <FacebookIcon />
          Facebook
        </Button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Login social em breve — use seu e-mail por enquanto.
      </p>

      <div className="relative">
        <Separator />
        <span className="absolute inset-0 -top-2 mx-auto w-fit bg-card px-2 text-xs text-muted-foreground">
          ou
        </span>
      </div>
    </div>
  );
}
