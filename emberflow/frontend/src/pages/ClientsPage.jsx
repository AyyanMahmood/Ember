import { Plus, Search, Filter, Edit, Trash2, FilePlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button, IconButton } from "../components/ui/Button.jsx";
import { Input } from "../components/ui/Input.jsx";
import { EmberSelect } from "../components/ui/EmberSelect.jsx";
import { Card } from "../components/ui/Card.jsx";
import { Table } from "../components/ui/Table.jsx";
import { EmptyState } from "../components/ui/EmptyState.jsx";
import { ConfirmDialog } from "../components/ui/Modal.jsx";
import { deleteClient, listClients } from "../services/api.js";
import { formatDate } from "../utils/format.js";

function EmptyStateIllustration({ variant }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
      className="empty-state__icon"
    >
      {variant === "users" && (
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
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    try {
      setClients(await listClients());
      setError("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClient(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  const countries = useMemo(
    () =>
      [
        ...new Set(clients.map((client) => client.country).filter(Boolean)),
      ].sort(),
    [clients],
  );
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
    {
      key: "name", label: "Name", sortable: true, render: (row) => (
        <Link to={`/app/clients/${row.id}`} className="table__link">{row.name}</Link>
      ),
    },
    { key: "company", label: "Company", sortable: true, render: (row) => row.company || "—" },
    { key: "email", label: "Email", sortable: true },
    { key: "country", label: "Country", sortable: true, render: (row) => row.country || "—" },
    { key: "created_at", label: "Created", sortable: true, render: (row) => formatDate(row.created_at?.slice(0, 10)) },
    {
      key: "actions", label: "Actions", align: "right", render: (row) => (
        <div className="table__actions">
          <IconButton
            as={Link}
            size="sm"
            to={`/app/invoices/new?client=${row.id}`}
            aria-label="Create invoice for this client"
            title="Create invoice"
          >
            <FilePlus size={14} />
          </IconButton>
          <IconButton as={Link} size="sm" to={`/app/clients/${row.id}/edit`} aria-label="Edit" title="Edit">
            <Edit size={14} />
          </IconButton>
          <IconButton
            size="sm"
            className="icon-button--danger"
            onClick={() => setDeleteTarget(row)}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Clients</p>
          <h2 className="heading-xl">People and companies you bill.</h2>
        </div>
        <Button
          as={Link}
          variant="primary"
          to="/app/clients/new"
          leftIcon={<Plus size={16} />}
        >
          Add client
        </Button>
      </div>

      {error && (
        <Card variant="default">
          <div className="error-panel" role="alert">
            {error}
          </div>
          <div className="form-actions">
            <Button variant="secondary" onClick={load}>Try again</Button>
          </div>
        </Card>
      )}

      <Card variant="default">
        <div className="filters-row">
          <Input
            placeholder="Name, company, email, or phone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search size={16} />}
            className="filters-row__input"
          />
          <EmberSelect
            value={country}
            onChange={(value) => setCountry(value)}
            options={[{ value: '', label: 'All countries' }, ...countries.map((c) => ({ value: c, label: c }))]}
            leftIcon={<Filter size={16} />}
            className="filters-row__select"
          />
        </div>

        <Table
          columns={columns}
          data={filteredClients}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortable
          pagination
          pageSize={10}
          onRowClick={(row) => navigate(`/app/clients/${row.id}`)}
          emptyTitle="No clients yet"
          emptyMessage="Add a client before creating invoices and proposals."
          emptyAction={{
            label: "Add client",
            to: "/app/clients/new",
          }}
          emptyIcon={<EmptyStateIllustration variant="users" />}
        />
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete client"
        message={deleteTarget ? `Delete ${deleteTarget.name}? Invoices linked to this client must be removed first.` : ''}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
