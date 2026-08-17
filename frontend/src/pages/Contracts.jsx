import { useEffect, useState } from "react";
import { api } from "../lib/api.js";
import Modal from "../components/Modal.jsx";
import {
  formatMoney,
  formatDate,
  toInputDate,
  STATUS_LABEL,
  STATUS_LIST,
} from "../lib/format.js";

const EMPTY = {
  clientId: "",
  title: "",
  description: "",
  amount: "",
  status: "PENDING",
  dueDate: "",
};

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [c, cl] = await Promise.all([api.get("/contracts"), api.get("/clients")]);
    setContracts(c.contracts);
    setClients(cl.clients);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, clientId: clients[0]?.id || "" });
    setError("");
    setOpen(true);
  }

  function openEdit(contract) {
    setEditing(contract);
    setForm({
      clientId: contract.clientId,
      title: contract.title,
      description: contract.description || "",
      amount: contract.amount,
      status: contract.status,
      dueDate: toInputDate(contract.dueDate),
    });
    setError("");
    setOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);

    // dueDate vazio precisa virar null, nao string vazia -
    // o backend espera uma data ou a ausencia dela.
    const payload = { ...form, dueDate: form.dueDate || null };

    try {
      if (editing) await api.put(`/contracts/${editing.id}`, payload);
      else await api.post("/contracts", payload);

      setOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(contract) {
    if (!window.confirm(`Excluir o contrato "${contract.title}"?`)) return;
    await api.delete(`/contracts/${contract.id}`);
    await load();
  }

  // Troca o status direto na tabela, sem abrir o formulario.
  async function quickStatus(contract, status) {
    await api.put(`/contracts/${contract.id}`, {
      clientId: contract.clientId,
      title: contract.title,
      description: contract.description || "",
      amount: contract.amount,
      status,
      dueDate: contract.dueDate,
    });
    await load();
  }

  const filtered =
    filter === "ALL" ? contracts : contracts.filter((c) => c.status === filter);

  const total = filtered.reduce((sum, c) => sum + Number(c.amount), 0);

  if (loading) return <div className="loading">Carregando...</div>;

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Contratos</h1>
          <p className="muted">
            {filtered.length} contrato(s) &middot; {formatMoney(total)}
          </p>
        </div>
        <button className="btn btn-primary" onClick={openCreate} disabled={clients.length === 0}>
          + Novo contrato
        </button>
      </header>

      {clients.length === 0 && (
        <div className="alert alert-info">
          Cadastre um cliente antes de criar um contrato.
        </div>
      )}

      <div className="toolbar tabs">
        {["ALL", ...STATUS_LIST].map((s) => (
          <button
            key={s}
            className={`tab ${filter === s ? "tab-active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "ALL" ? "Todos" : STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <section className="panel">
        {filtered.length === 0 ? (
          <div className="empty">
            <p>Nenhum contrato aqui.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Titulo</th>
                <th>Cliente</th>
                <th>Valor</th>
                <th>Prazo</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id}>
                  <td>
                    <strong>{c.title}</strong>
                    {c.description && <div className="small muted">{c.description}</div>}
                  </td>
                  <td className="muted">{c.client.name}</td>
                  <td>{formatMoney(c.amount)}</td>
                  <td className="muted">{formatDate(c.dueDate)}</td>
                  <td>
                    <select
                      className={`badge-select badge-${c.status.toLowerCase()}`}
                      value={c.status}
                      onChange={(e) => quickStatus(c, e.target.value)}
                    >
                      {STATUS_LIST.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
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
          title={editing ? "Editar contrato" : "Novo contrato"}
          onClose={() => setOpen(false)}
        >
          <form onSubmit={handleSubmit}>
            {error && <div className="alert">{error}</div>}

            <label>
              Cliente *
              <select
                required
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
              >
                <option value="">Selecione...</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.company ? ` - ${c.company}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Titulo *
              <input
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Site institucional"
              />
            </label>

            <label>
              Descricao
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <div className="form-row">
              <label>
                Valor (R$) *
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                />
              </label>

              <label>
                Prazo
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                />
              </label>
            </div>

            <label>
              Status
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                {STATUS_LIST.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </label>

            <div className="modal-foot">
              <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
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
