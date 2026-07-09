import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import { deleteClient, listClients } from '../services/api.js';
import { formatDate } from '../utils/format.js';

export default function ClientsPage() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState('');
  const [country, setCountry] = useState('');
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

  const countries = [...new Set(clients.map((client) => client.country).filter(Boolean))].sort();
  const filteredClients = useMemo(() => {
    const term = query.trim().toLowerCase();
    return clients.filter((client) => {
      const matchesTerm =
        !term ||
        [client.name, client.company, client.email, client.phone]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term));
      const matchesCountry = !country || client.country === country;
      return matchesTerm && matchesCountry;
    });
  }, [clients, query, country]);

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
        <div className="filters-row">
          <label>
            Search
            <input
              placeholder="Name, company, email, or phone"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            Country
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="">All countries</option>
              {countries.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
        {clients.length === 0 ? (
          <EmptyState
            title="No clients yet"
            message="Add a client before creating invoices and proposals."
            actionLabel="Add client"
            actionTo="/app/clients/new"
          />
        ) : filteredClients.length === 0 ? (
          <EmptyState
            title="No matching clients"
            message="Adjust your search or filter to find the client record."
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
                {filteredClients.map((client) => (
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
