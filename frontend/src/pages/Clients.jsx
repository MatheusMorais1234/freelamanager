import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import Modal from "../components/Modal.jsx";

const EMPTY = { name: "", email: "", phone: "", company: "" };

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = criando
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const data = await api.get("/clients");
    setClients(data.clients);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setError("");
    setOpen(true);
  }

  function openEdit(client) {
    setEditing(client);
    setForm({
      name: client.name,
      // o banco guarda null; o input precisa de string
      email: client.email || "",
      phone: client.phone || "",
      company: client.company || "",
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (editing) await api.put(`/clients/${editing.id}`, form);
      else await api.post("/clients", form);

      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(client) {
    const ok = window.confirm(
      `Excluir "${client.name}"? Os contratos deste cliente tambem serao apagados.`
    );
    if (!ok) return;

    await api.delete(`/clients/${client.id}`);
    await load();
  }

  // Filtro roda no navegador: a lista e pequena, nao vale
  // uma ida ao servidor a cada tecla digitada.
  const filtered = clients.filter((c) =>
    `${c.name} ${c.company || ""} ${c.email || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Clientes</h1>
          <p className="muted">{clients.length} cadastrado(s)</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Novo cliente
        </button>
      </header>

      <div className="toolbar">
        <input
          className="search"
          placeholder="Buscar por nome, empresa ou e-mail..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <section className="panel">
        {filtered.length === 0 ? (
          <div className="empty">
            <p>{clients.length === 0 ? "Nenhum cliente ainda." : "Nada encontrado."}</p>
            {clients.length === 0 && (
              <button className="btn btn-primary" onClick={openCreate}>
                Cadastrar o primeiro
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Contato</th>
                <th>Contratos</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td className="muted">{c.company || "-"}</td>
                  <td className="muted">
                    {c.email || "-"}
                    {c.phone && <div className="small">{c.phone}</div>}
                  </td>
                  <td>
                    <span className="pill">{c._count.contracts}</span>
                  </td>
                  <td className="row-actions">
                    <button className="btn btn-ghost" onClick={() => openEdit(c)}>
                      Editar
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(c)}>
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {open && (
        <Modal
          title={editing ? "Editar cliente" : "Novo cliente"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            {error && <div className="alert">{error}</div>}

            <label>
              Nome *
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label>
              Empresa
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label>
                E-mail
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>

              <label>
                Telefone
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </label>
            </div>

            <div className="modal-foot">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setOpen(false)}
              >
                Cancelar
              </button>
              <button className="btn btn-primary" disabled={busy}>
                {busy ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
