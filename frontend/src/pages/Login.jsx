import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    // Sem isto o navegador recarrega a pagina inteira ao enviar.
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      await login(form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      // finally garante que o botao destrava mesmo se der erro.
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="brand brand-lg">
          <span className="brand-mark">FM</span>
          <span className="brand-name">FreelaManager</span>
        </div>
        <p className="auth-sub">Seus clientes e contratos em um lugar so.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert">{error}</div>}

          <label>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="voce@email.com"
            />
          </label>

          <label>
            Senha
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="********"
            />
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="auth-foot">
          Nao tem conta? <Link to="/register">Criar conta</Link>
        </p>
      </div>
    </div>
  );
}
