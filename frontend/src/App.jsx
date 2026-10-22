
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";

import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import Layout from "./components/Layout.jsx";
import Brand from "./components/Brand.jsx";
import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Clients from "./pages/Clients.jsx";
import Contracts from "./pages/Contracts.jsx";
import Payments from "./pages/Payments.jsx";
import Reports from "./pages/Reports.jsx";

// enquanto confere o token salvo
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

// Telas internas. Visitante na raiz ve a landing.\nIsso e so UX, quem protege os dados e o backend.
function Private({ children }) {
  const { user, loading } = useAuth();
  const { pathname } = useLocation();

  if (loading) return <SessionLoading />;
  if (!user) return pathname === "/" ? <Landing /> : <Navigate to="/login" replace />;

  return children;
}

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

          {/* rotas internas usam o Layout */}
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

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
