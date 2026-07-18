import { Plus, Check, Send, Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Table } from '../components/ui/Table.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { deleteInvoice, listInvoices, updateInvoiceStatus } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';

function EmptyStateIllustration({ variant }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" className="empty-state__icon">
      {variant === 'document' && (
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </>
      )}
    </svg>
  );
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      setInvoices(await listInvoices());
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

  async function markPaid(invoice) {
    try {
      await updateInvoiceStatus(invoice.id, 'paid');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function markSent(invoice) {
    try {
      await updateInvoiceStatus(invoice.id, 'sent');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(invoice) {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    try {
      await deleteInvoice(invoice.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  const columns = [
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'client', label: 'Client' },
    { key: 'invoice_date', label: 'Issued' },
    { key: 'due_date', label: 'Due' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total', align: 'right' },
    { key: 'actions', label: 'Actions', align: 'right' },
  ];

  const tableData = invoices.map((invoice) => ({
    ...invoice,
    invoice_number: (
      <Link to={`/app/invoices/${invoice.id}`} className="table__link">
        {invoice.invoice_number}
      </Link>
    ),
    client: invoice.clients?.company || invoice.clients?.name || '—',
    invoice_date: formatDate(invoice.invoice_date),
    due_date: formatDate(invoice.due_date),
    status: <StatusBadge invoice={invoice} />,
    total: <span className="mono">{formatMoney(invoice.total, invoice.currency)}</span>,
    actions: (
      <div className="table__actions">
        {invoice.status === 'draft' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markSent(invoice)}
            leftIcon={<Send size={14} />}
          >
            Mark sent
          </Button>
        )}
        {invoice.status !== 'paid' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => markPaid(invoice)}
            leftIcon={<Check size={14} />}
          >
            Mark paid
          </Button>
        )}
        <Button as={Link} variant="ghost" size="sm" to={`/app/invoices/${invoice.id}/edit`} leftIcon={<Edit size={14} />}>
          Edit
        </Button>
        <Button
          variant="danger"
          size="sm"
          onClick={() => handleDelete(invoice)}
          leftIcon={<Trash2 size={14} />}
        >
          Delete
        </Button>
      </div>
    ),
  }));

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading invoices..." />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Invoices</p>
          <h2>Create, send, and track client invoices.</h2>
        </div>
        <Button as={Link} variant="primary" to="/app/invoices/new" leftIcon={<Plus size={16} />}>
          New invoice
        </Button>
      </div>

      {error && <div className="error-panel" role="alert">{error}</div>}

      <Card variant="default">
        <Table
          columns={columns}
          data={tableData}
          keyExtractor={(row) => row.id}
          emptyTitle="No invoices yet"
          emptyMessage="Create an invoice with line items, taxes, and due dates."
          emptyAction={{
            label: 'Create invoice',
            to: '/app/invoices/new',
          }}
          emptyIcon={<EmptyStateIllustration variant="document" />}
        />
      </Card>
    </div>
  );
}