// ============================================================
// ConfirmDialog - confirmacao de acao destrutiva
// ------------------------------------------------------------
// POR QUE EXISTE: o mesmo AlertDialog de exclusao estava
// copiado em Clients, Contracts e Payments - tres blocos de
// vinte linhas iguais, mudando so o texto. Cada copia era uma
// chance de a proxima tela esquecer alguma parte.
//
// AlertDialog (e nao Dialog) porque a acao e destrutiva: ele
// prende o foco e exige uma escolha explicita, sem "clicar
// fora para fechar".
//
// O botao usa "text-destructive-foreground" em vez do
// "text-white" literal que estava nas tres copias: branco
// chapado ignora o tema e quebra se a cor destrutiva mudar.
// ============================================================

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.jsx";

/**
 * @param {boolean}  open
 * @param {Function} onOpenChange
 * @param {ReactNode} title
 * @param {ReactNode} description  aceita JSX (ex.: um <strong> no meio)
 * @param {string}   confirmLabel
 * @param {Function} onConfirm
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Excluir",
  onConfirm,
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            // asChild: a descricao pode receber JSX, e um <p>
            // dentro de outro <p> e HTML invalido.
            <AlertDialogDescription asChild>
              <div>{description}</div>
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmDialog;
