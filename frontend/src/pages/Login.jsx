import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2, PlayCircle } from "lucide-react";

import { useAuth } from "@/context/AuthContext.jsx";
import Brand from "@/components/Brand.jsx";
import SocialAuth from "@/components/SocialAuth.jsx";

import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Alert, AlertDescription } from "@/components/ui/alert.jsx";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card.jsx";

// Conta demo (npm run seed:demo). Sem as envs o botao nao aparece.
const DEMO_EMAIL = import.meta.env.VITE_DEMO_EMAIL;
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD;
const TEM_DEMO = Boolean(DEMO_EMAIL && DEMO_PASSWORD);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // recebe por parametro pq o setState nao e imediato
  async function entrar(mail, senha) {
    setError("");
    setBusy(true);

    try {
      await login(mail, senha);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    entrar(email, password);
  }

  function entrarComDemo() {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    entrar(DEMO_EMAIL, DEMO_PASSWORD);
  }

  return (
    <div className="auth-bg grid min-h-svh place-items-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <Brand size="lg" className="justify-center" />

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Entrar na sua conta</CardTitle>
            <CardDescription>
              Gerencie seus clientes e contratos em um só lugar.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-5">
            <SocialAuth />

            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pr-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    // focus ring igual ao ui/button
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-md text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Entrando..." : "Entrar"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Não tem conta?{" "}
              <Link
                to="/register"
                className="font-medium text-primary-emphasis hover:underline"
              >
                Criar agora
              </Link>
            </p>

            {TEM_DEMO && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full gap-2"
                  onClick={entrarComDemo}
                  disabled={busy}
                >
                  <PlayCircle className="size-4" />
                  Entrar com a conta de demonstração
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Dados fictícios, só para conhecer o sistema.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
