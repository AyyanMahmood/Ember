import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Table } from '../components/ui/Table.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { deleteClient, listClients } from '../services/api.js';
import { formatDate } from '../utils/format.js';

function EmptyStateIllustration({ variant }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="empty-state__icon">
      {variant === 'users' && (
        <>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      )}
    </svg>
  );
}

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

  const countries = useMemo(() => [...new Set(clients.map((client) => client.country).filter(Boolean))].sort(), [clients]);
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

  const columns = [
    { key: 'name', label: 'Name' },
    { key: 'company', label: 'Company' },
    { key: 'email', label: 'Email' },
    { key: 'country', label: 'Country' },
    { key: 'created_at', label: 'Created' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const tableData = useMemo(() => filteredClients.map((client) => ({
    ...client,
    name: <Link to={`/app/clients/${client.id}`} className="table__link">{client.name}</Link>,
    company: client.company || '—',
    email: client.email,
    country: client.country || '—',
    created_at: formatDate(client.created_at?.slice(0, 10)),
    actions: (
      <div className="table__actions">
        <Button as={Link} variant="ghost" size="sm" to={`/app/clients/${client.id}/edit`} leftIcon={<Edit size={14} />}>
          Edit
        </Button>
        <Button variant="danger" size="sm" onClick={() => handleDelete(client)} leftIcon={<Trash2 size={14} />}>
          Delete
        </Button>
      </div>
    ),
  })), [filteredClients]);

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading clients..." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Clients</p>
          <h2>People and companies you bill.</h2>
        </div>
        <Button as={Link} variant="primary" to="/app/clients/new" leftIcon={<Plus size={16} />}>
          Add client
        </Button>
      </div>

      {error && <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card>}

      <Card variant="default">
        <div className="filters-row">
          <Input
            placeholder="Name, company, email, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search size={16} />}
            className="filters-row__input"
          />
          <Select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            options={countries.map((c) => ({ value: c, label: c }))}
            placeholder="All countries"
            leftIcon={<Filter size={16} />}
            className="filters-row__select"
          />
        </div>

        <Table
          columns={columns}
          data={tableData}
          keyExtractor={(row) => row.id}
          emptyTitle="No clients yet"
          emptyMessage="Add a client before creating invoices and proposals."
          emptyAction={{
            label: 'Add client',
            to: '/app/clients/new',
          }}
          emptyIcon={<EmptyStateIllustration variant="users" />}
        />
      </Card>
    </div>
  );
}