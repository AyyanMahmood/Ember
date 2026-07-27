import { Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader, StatCard } from '../components/ui/Card.jsx';
import { Table } from '../components/ui/Table.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { deleteClient, getClient, listInvoices } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [clientRow, invoiceRows] = await Promise.all([getClient(id), listInvoices()]);
      setClient(clientRow);
      setInvoices(invoiceRows.filter((invoice) => invoice.client_id === id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteClient(id);
      navigate('/app/clients');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  const summary = useMemo(() => {
    const paid = invoices.filter((invoice) => invoice.status === 'paid');
    const outstanding = invoices.filter((invoice) => ['sent', 'overdue'].includes(effectiveStatus(invoice)));
    const currency = invoices[0]?.currency || 'USD';
    return {
      totalBilled: invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      totalPaid: paid.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      totalOutstanding: outstanding.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0),
      currency,
    };
  }, [invoices]);

  const columns = [
    { key: 'invoice_number', label: 'Invoice', render: (row) => (
      <Link to={`/app/invoices/${row.id}`} className="table__link">{row.invoice_number}</Link>
    ) },
    { key: 'invoice_date', label: 'Date', render: (row) => formatDate(row.invoice_date) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={effectiveStatus(row)} size="sm" /> },
    { key: 'total', label: 'Total', align: 'right', render: (row) => formatMoney(row.total, row.currency) },
  ];

  if (loading) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Client</p>
            <h1 className="heading-xl">Loading…</h1>
          </div>
        </div>
        <section className="stats-grid stats-grid--3" aria-label="Client billing summary" aria-busy="true">
          {[...Array(3)].map((_, index) => (
            <article className="stat-card stat-card--loading" key={index} aria-hidden="true">
              <LoadingSpinner size="sm" />
            </article>
          ))}
        </section>
        <section className="detail-grid">
          <Card variant="default">
            <CardHeader title="Contact" />
            <LoadingSpinner size="sm" label="Loading contact details..." />
          </Card>
          <Card variant="default">
            <CardHeader title="Notes" />
            <LoadingSpinner size="sm" label="Loading notes..." />
          </Card>
        </section>
        <Card variant="default">
          <CardHeader title="Invoices" />
          <Table columns={columns} data={[]} loading keyExtractor={(row) => row.id} />
        </Card>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Client</p>
            <h1 className="heading-xl">Something went wrong.</h1>
          </div>
          <Button as={Link} variant="ghost" to="/app/clients">Back to clients</Button>
        </div>
        <Card variant="default">
          <div className="error-panel" role="alert">{error}</div>
          <div className="form-actions">
            <Button variant="secondary" onClick={load}>Try again</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Client</p>
          <h1 className="heading-xl">{client.name}</h1>
        </div>
        <div className="actions">
          <Button as={Link} variant="ghost" to={`/app/clients/${id}/edit`}>Edit</Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      <section className="stats-grid stats-grid--3" aria-label="Client billing summary">
        <StatCard label="Total billed" value={formatMoney(summary.totalBilled, summary.currency)} note="All invoices" />
        <StatCard label="Paid" value={formatMoney(summary.totalPaid, summary.currency)} note="Collected" />
        <StatCard label="Outstanding" value={formatMoney(summary.totalOutstanding, summary.currency)} note="Sent or overdue" />
      </section>

      <section className="detail-grid">
        <Card variant="default">
          <CardHeader title="Contact" />
          <dl className="details-list">
            <dt>Email</dt>
            <dd>{client.email}</dd>
            <dt>Company</dt>
            <dd>{client.company || '-'}</dd>
            <dt>Phone</dt>
            <dd>{client.phone || '-'}</dd>
            <dt>Country</dt>
            <dd>{client.country || '-'}</dd>
          </dl>
        </Card>
        <Card variant="default">
          <CardHeader title="Notes" />
          <p className="preserve">{client.notes || 'No notes recorded.'}</p>
        </Card>
      </section>

      <Card variant="default">
        <CardHeader
          title="Invoices"
          action={
            <Button as={Link} variant="secondary" size="sm" to={`/app/invoices/new?client=${id}`} leftIcon={<Plus size={14} />}>
              Create invoice
            </Button>
          }
        />
        <Table
          columns={columns}
          data={invoices}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/app/invoices/${row.id}`)}
          emptyTitle="No invoices yet"
          emptyMessage="Create the first invoice for this client."
          emptyAction={{ label: 'Create invoice', to: `/app/invoices/new?client=${id}` }}
        />
      </Card>

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete client"
        message={`Delete ${client.name}? Invoices linked to this client must be removed first.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
