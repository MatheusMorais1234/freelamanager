import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, Loader2, X } from "lucide-react";

import { useAuth } from "@/context/AuthContext.jsx";
import Brand from "@/components/Brand.jsx";
import SocialAuth from "@/components/SocialAuth.jsx";
import { cn } from "@/lib/utils.js";

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

// As mesmas exigencias que o backend aplica. Repetir aqui e so
// para dar retorno imediato - quem decide continua sendo a API.
const RULES = [
  { label: "Ao menos 8 caracteres", test: (v) => v.length >= 8 },
  { label: "Uma letra", test: (v) => /[a-zA-Z]/.test(v) },
  { label: "Um número", test: (v) => /\d/.test(v) },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await register(form.name, form.email, form.password);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-bg grid min-h-svh place-items-center p-4">
      <div className="w-full max-w-sm space-y-6 py-8">
        <Brand size="lg" className="justify-center" />

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-xl">Criar sua conta</CardTitle>
            <CardDescription>Leva menos de um minuto. É grátis.</CardDescription>
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
                <Label htmlFor="name">Nome completo</Label>
                <Input
                  id="name"
                  required
                  autoComplete="name"
                  placeholder="Maria Souza"
                  value={form.name}
                  onChange={set("name")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="voce@exemplo.com"
                  value={form.email}
                  onChange={set("email")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    placeholder="••••••••"
                    className="pr-10"
                    value={form.password}
                    onChange={set("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>

                {form.password && (
                  <ul className="space-y-1 pt-1">
                    {RULES.map(({ label, test }) => {
                      const ok = test(form.password);
                      return (
                        <li
                          key={label}
                          className={cn(
                            "flex items-center gap-1.5 text-xs",
                            ok ? "text-success" : "text-muted-foreground"
                          )}
                        >
                          {ok ? <Check className="size-3" /> : <X className="size-3" />}
                          {label}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {busy ? "Criando..." : "Criar conta"}
              </Button>
            </form>

            <p className="text-center text-sm text-muted-foreground">
              Já tem conta?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Entrar
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
