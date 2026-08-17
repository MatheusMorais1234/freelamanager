// Moldura das telas internas: barra lateral + area de conteudo.

import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">FM</span>
          <span className="brand-name">FreelaManager</span>
        </div>

        <nav className="nav">
          {/* NavLink sabe sozinho qual rota esta ativa */}
          <NavLink to="/" end>
            Painel
          </NavLink>
          <NavLink to="/clients">Clientes</NavLink>
          <NavLink to="/contracts">Contratos</NavLink>
        </nav>

        <div className="sidebar-foot">
          <div className="user-chip">
            <span className="avatar">{user?.name?.[0]?.toUpperCase()}</span>
            <div className="user-meta">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost btn-block" onClick={logout}>
            Sair
          </button>
        </div>
      </aside>

      <main className="content">
        {/* Outlet = onde o React Router encaixa a tela atual */}
        <Outlet />
      </main>
    </div>
  );
}
