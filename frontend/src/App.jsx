// ============================================================
// App.jsx - o mapa de rotas do frontend
// ------------------------------------------------------------
// Aqui e "roteamento de cliente": trocar de tela nao recarrega
// a pagina, o React so troca o componente exibido.
// ============================================================

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Brand from "./components/Brand.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import Contracts from "./pages/Contracts.jsx";
import Payments from "./pages/Payments.jsx";
import Reports from "./pages/Reports.jsx";

// Tela cheia mostrada enquanto o app confere se o token salvo
// ainda vale. Dura um piscar de olhos em rede boa.
function SessionLoading() {
  return (
    <div className="auth-bg grid min-h-svh place-items-center gap-4">
      <div className="flex flex-col items-center gap-4">
        <Brand size="lg" />
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    </div>
  );
}

// Porteiro das telas internas: sem usuario logado, manda pro login.
// ATENCAO: isto e conveniencia de interface, NAO seguranca.
// Quem protege os dados de verdade e o middleware do backend -
// qualquer um pode burlar o React pelo devtools do navegador.
function Private({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <SessionLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return children;
}

// Ja logado nao deve ver a tela de login.
function PublicOnly({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <SessionLoading />;
  if (user) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <PublicOnly>
                <Login />
              </PublicOnly>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnly>
                <Register />
              </PublicOnly>
            }
          />

          {/* Rotas aninhadas: todas compartilham o Layout
              (a barra lateral nao e redesenhada a cada troca) */}
          <Route
            element={
              <Private>
                <Layout />
              </Private>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/contracts" element={<Contracts />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/reports" element={<Reports />} />
          </Route>

          {/* Qualquer outro endereco volta para a home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
