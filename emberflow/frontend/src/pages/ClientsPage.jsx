import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { deleteClient, listClients } from '../services/api.js';
import { formatDate } from '../utils/format.js';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setClients(await listClients());
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(client) {
    if (!window.confirm(`Delete ${client.name}? Invoices linked to this client must be removed first.`)) return;
    try {
      await deleteClient(client.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="panel">Loading clients...</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>People and companies you bill.</h2>
        </div>
        <Link className="button primary" to="/app/clients/new">
          <Plus size={16} />
          Add client
        </Link>
      </div>

      {error ? <div className="panel error-panel">{error}</div> : null}
      <section className="panel">
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            message="Add a client before creating invoices and proposals."
            actionLabel="Add client"
            actionTo="/app/clients/new"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Email</th>
                  <th>Country</th>
                  <th>Created</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link to={`/app/clients/${client.id}`}>{client.name}</Link>
                    </td>
                    <td>{client.company || '-'}</td>
                    <td>{client.email}</td>
                    <td>{client.country || '-'}</td>
                    <td>{formatDate(client.created_at?.slice(0, 10))}</td>
                    <td className="right actions">
                      <Link className="button small ghost" to={`/app/clients/${client.id}/edit`}>
                        Edit
                      </Link>
                      <button className="button small danger" onClick={() => handleDelete(client)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
