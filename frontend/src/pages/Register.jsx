import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [fields, setFields] = useState({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setFields({});
    setBusy(true);

    try {
      await register(form.name, form.email, form.password);
      navigate("/");
    } catch (err) {
      setError(err.message);
      // erros campo a campo vindos do Zod no backend
      setFields(err.fields || {});
    } finally {
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
        <p className="auth-sub">Crie sua conta gratuita.</p>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert">{error}</div>}

          <label>
            Nome
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Seu nome"
            />
            {fields.name && <small className="field-error">{fields.name}</small>}
          </label>

          <label>
            E-mail
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="voce@email.com"
            />
            {fields.email && <small className="field-error">{fields.email}</small>}
          </label>

          <label>
            Senha
            <input
              type="password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="minimo 8 caracteres"
            />
            {fields.password && <small className="field-error">{fields.password}</small>}
          </label>

          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Criando..." : "Criar conta"}
          </button>
        </form>

        <p className="auth-foot">
          Ja tem conta? <Link to="/login">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
