// ============================================================
// Moldura das telas internas
// ------------------------------------------------------------
// Tres pecas fixas em volta do conteudo:
//   - a coluna de navegacao (no celular vira uma gaveta);
//   - a barra do topo, com o nome da tela e as acoes de conta;
//   - a area central, onde o React Router encaixa a pagina.
//
// O mesmo JSX da navegacao serve ao desktop e ao celular - so
// muda ONDE ele e renderizado.
// ============================================================

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Wallet,
  BarChart3,
  LogOut,
  Menu,
  Moon,
  Sun,
} from "lucide-react";

import { useAuth } from "@/context/AuthContext.jsx";
import { useTheme } from "@/context/ThemeContext.jsx";
import Brand from "@/components/Brand.jsx";
import { initials } from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet.jsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.jsx";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip.jsx";

const NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/contracts", label: "Contratos", icon: FileText },
  { to: "/payments", label: "Pagamentos", icon: Wallet },
  { to: "/reports", label: "Relatórios", icon: BarChart3 },
];

// Nome da tela atual, usado no titulo da barra superior.
function useCurrentPage() {
  const { pathname } = useLocation();
  return (
    NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to))) ?? NAV[0]
  );
}

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-0.5">
      <p className="mb-2 px-3 text-[11px] font-semibold tracking-widest text-muted-foreground/70 uppercase">
        Gestão
      </p>

      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}>
          {({ isActive }) => (
            <span
              className={cn(
                "group relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground"
              )}
            >
              {/* Marcador vertical do item ativo: diz onde o
                  usuario esta sem depender so da cor do texto. */}
              <span
                className={cn(
                  "absolute top-1.5 bottom-1.5 -left-1 w-1 rounded-full bg-primary transition-opacity",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

// Cartao do usuario no rodape da coluna: avatar, nome e um
// menu com as acoes da conta.
function AccountMenu() {
  const { user, logout } = useAuth();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-sidebar-border hover:bg-sidebar-accent/60"
        >
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {/* min-w-0 permite o truncate funcionar dentro do flex */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" side="top" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user?.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={logout} className="gap-2 text-destructive">
          <LogOut className="size-4" />
          Sair da conta
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarContent({ onNavigate }) {
  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand className="px-1" />

      <NavItems onNavigate={onNavigate} />

      <div className="flex flex-col gap-2">
        <Separator />
        <AccountMenu />
      </div>
    </div>
  );
}

// Botao de tema. O icone mostra para onde a acao LEVA (sol =
// vai clarear), que e o que o usuario espera ao olhar.
function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const escuro = theme === "dark";
  const rotulo = escuro ? "Mudar para o tema claro" : "Mudar para o tema escuro";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={rotulo}>
          {escuro ? <Sun className="size-4.5" /> : <Moon className="size-4.5" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{rotulo}</TooltipContent>
    </Tooltip>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const page = useCurrentPage();
  const PageIcon = page.icon;

  // Trocar de tela deve fechar a gaveta no celular.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-svh md:grid md:grid-cols-[16rem_1fr]">
      {/* Coluna fixa - some no celular */}
      <aside className="sticky top-0 hidden h-svh border-r border-sidebar-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Barra superior: no celular abre a gaveta, no desktop
            situa o usuario na tela atual. */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur md:px-8">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Abrir menu"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              {/* Titulo exigido por leitores de tela; invisivel na tela */}
              <SheetTitle className="sr-only">Navegação</SheetTitle>
              <SidebarContent onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>

          <Brand className="md:hidden" />

          <div className="hidden items-center gap-2 md:flex">
            <PageIcon className="size-4 text-muted-foreground" />
            <span className="text-sm font-medium">{page.label}</span>
          </div>

          <div className="ml-auto flex items-center gap-1">
            <ThemeToggle />
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-6xl">
            {/* Outlet = onde o React Router encaixa a tela atual */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
