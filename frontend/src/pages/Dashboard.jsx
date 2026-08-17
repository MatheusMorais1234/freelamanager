import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api.js";
import { formatMoney, formatDate, STATUS_LABEL } from "../lib/format.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Promise.all dispara as duas chamadas EM PARALELO.
    // Uma depois da outra levaria o dobro do tempo.
    Promise.all([api.get("/contracts/stats"), api.get("/contracts")])
      .then(([s, c]) => {
        setStats(s.stats);
        setRecent(c.contracts.slice(0, 5));
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Carregando...</div>;

  const aReceber =
    Number(stats.byStatus.PENDING.total) + Number(stats.byStatus.ACTIVE.total);

  return (
    <>
      <header className="page-head">
        <div>
          <h1>Ola, {user?.name?.split(" ")[0]}</h1>
          <p className="muted">Um resumo do seu negocio hoje.</p>
        </div>
      </header>

      <section className="stat-grid">
        <div className="stat">
          <span className="stat-label">Clientes</span>
          <strong className="stat-value">{stats.totalClients}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Contratos</span>
          <strong className="stat-value">{stats.totalContracts}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">A receber</span>
          <strong className="stat-value accent">{formatMoney(aReceber)}</strong>
        </div>
        <div className="stat">
          <span className="stat-label">Recebido</span>
          <strong className="stat-value ok">
            {formatMoney(stats.byStatus.COMPLETED.total)}
          </strong>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Por status</h2>
        </div>
        <div className="status-grid">
          {Object.entries(stats.byStatus).map(([status, info]) => (
            <div key={status} className="status-row">
              <span className={`badge badge-${status.toLowerCase()}`}>
                {STATUS_LABEL[status]}
              </span>
              <span className="muted">{info.count} contrato(s)</span>
              <strong>{formatMoney(info.total)}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Contratos recentes</h2>
          <Link className="btn btn-ghost" to="/contracts">
            Ver todos
          </Link>
        </div>

        {recent.length === 0 ? (
          <div className="empty">
            <p>Nenhum contrato ainda.</p>
            <Link className="btn btn-primary" to="/contracts">
              Criar o primeiro
            </Link>
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
              </tr>
            </thead>
            <tbody>
              {recent.map((c) => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td className="muted">{c.client.name}</td>
                  <td>{formatMoney(c.amount)}</td>
                  <td className="muted">{formatDate(c.dueDate)}</td>
                  <td>
                    <span className={`badge badge-${c.status.toLowerCase()}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
