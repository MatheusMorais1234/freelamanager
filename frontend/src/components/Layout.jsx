// ============================================================
// Moldura das telas internas
// ------------------------------------------------------------
// No desktop a navegacao e uma coluna fixa. No celular ela vira
// uma gaveta (Sheet) aberta pelo botao de menu - o mesmo JSX
// serve aos dois casos, so muda onde ele e renderizado.
// ============================================================

import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, Users, FileText, Wallet, LogOut, Menu } from "lucide-react";

import { useAuth } from "@/context/AuthContext.jsx";
import Brand from "@/components/Brand.jsx";
import { initials } from "@/lib/format.js";
import { cn } from "@/lib/utils.js";

import { Button } from "@/components/ui/button.jsx";
import { Avatar, AvatarFallback } from "@/components/ui/avatar.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet.jsx";

const NAV = [
  { to: "/", label: "Painel", icon: LayoutDashboard, end: true },
  { to: "/clients", label: "Clientes", icon: Users },
  { to: "/contracts", label: "Contratos", icon: FileText },
  { to: "/payments", label: "Pagamentos", icon: Wallet },
];

function NavItems({ onNavigate }) {
  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} onClick={onNavigate}>
          {({ isActive }) => (
            <span
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-primary"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </span>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

function SidebarContent({ onNavigate }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <Brand className="px-1" />

      <NavItems onNavigate={onNavigate} />

      <div className="flex flex-col gap-3">
        <Separator />

        <div className="flex items-center gap-2.5 px-1">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-xs font-semibold">
              {initials(user?.name)}
            </AvatarFallback>
          </Avatar>
          {/* min-w-0 permite o truncate funcionar dentro do flex */}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <Button variant="ghost" className="justify-start gap-2" onClick={logout}>
          <LogOut className="size-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  // Trocar de tela deve fechar a gaveta no celular.
  useEffect(() => setMenuOpen(false), [pathname]);

  return (
    <div className="min-h-svh md:grid md:grid-cols-[16rem_1fr]">
      {/* Coluna fixa - some no celular */}
      <aside className="sticky top-0 hidden h-svh border-r border-sidebar-border bg-sidebar md:block">
        <SidebarContent />
      </aside>

      {/* Barra superior - aparece so no celular */}
      <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/80 px-4 py-3 backdrop-blur md:hidden">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Abrir menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 bg-sidebar p-0">
            {/* Titulo exigido por leitores de tela; invisivel na tela */}
            <SheetTitle className="sr-only">Navegação</SheetTitle>
            <SidebarContent onNavigate={() => setMenuOpen(false)} />
          </SheetContent>
        </Sheet>

        <Brand />
      </header>

      <main className="min-w-0 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-6xl">
          {/* Outlet = onde o React Router encaixa a tela atual */}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
