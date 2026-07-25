import { Plus, Check, Send, Edit, Trash2, Copy, Download, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Table } from '../components/ui/Table.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import {
  deleteInvoice,
  duplicateInvoice,
  getInvoice,
  getProfile,
  listInvoices,
  updateInvoiceStatus,
} from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus, nextInvoiceNumber } from '../utils/invoice.js';
import { InvoiceDocument } from '../document-studio/InvoiceDocument.jsx';
import { exportNodeToPdf } from '../document-studio/export.js';
import { renderDocumentOffscreen } from '../document-studio/offscreenRender.jsx';

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

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending', label: 'Pending (sent + overdue)' },
  { value: 'sent', label: 'Sent' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'paid', label: 'Paid' },
];

export default function InvoicesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pdfLoadingId, setPdfLoadingId] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [invoiceRows, profileRow] = await Promise.all([listInvoices(), getProfile()]);
      setInvoices(invoiceRows);
      setProfile(profileRow);
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

  function handleStatusFilterChange(value) {
    setStatusFilter(value);
    setSelectedKeys([]);
    const next = new URLSearchParams(searchParams);
    if (value) next.set('status', value);
    else next.delete('status');
    setSearchParams(next, { replace: true });
  }

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

  async function duplicateRow(invoice) {
    try {
      const copied = await duplicateInvoice(invoice.id, user.id, nextInvoiceNumber(profile?.invoice_prefix || 'INV'));
      navigate(`/app/invoices/${copied.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function downloadPdf(invoice) {
    setPdfLoadingId(invoice.id);
    try {
      const full = await getInvoice(invoice.id);
      const { node, cleanup } = await renderDocumentOffscreen(<InvoiceDocument invoice={full} profile={profile} />);
      try {
        await exportNodeToPdf(node, full.invoice_number);
      } finally {
        cleanup();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoadingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setActionLoading(true);
    try {
      await deleteInvoice(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function confirmBulkDelete() {
    setActionLoading(true);
    try {
      await Promise.all(selectedKeys.map((id) => deleteInvoice(id)));
      setSelectedKeys([]);
      setBulkDeleteOpen(false);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  async function bulkMarkPaid() {
    setActionLoading(true);
    try {
      await Promise.all(selectedKeys.map((id) => updateInvoiceStatus(id, 'paid')));
      setSelectedKeys([]);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  }

  const filteredInvoices = useMemo(() => {
    const term = query.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const status = effectiveStatus(invoice);
      const matchesStatus = !statusFilter
        || status === statusFilter
        || (statusFilter === 'pending' && ['sent', 'overdue'].includes(status));
      const matchesTerm = !term || [
        invoice.invoice_number,
        invoice.clients?.company,
        invoice.clients?.name,
      ].filter(Boolean).some((value) => value.toLowerCase().includes(term));
      return matchesStatus && matchesTerm;
    });
  }, [invoices, query, statusFilter]);

  const columns = [
    { key: 'invoice_number', label: 'Invoice', sortable: true, render: (row) => (
      <Link to={`/app/invoices/${row.id}`} className="table__link">{row.invoice_number}</Link>
    ) },
    { key: 'client_name', label: 'Client', sortable: true, render: (row) => row.clients?.company || row.clients?.name || '—' },
    { key: 'invoice_date', label: 'Issued', sortable: true, render: (row) => formatDate(row.invoice_date) },
    { key: 'due_date', label: 'Due', sortable: true, render: (row) => formatDate(row.due_date) },
    { key: 'status', label: 'Status', render: (row) => <StatusBadge status={effectiveStatus(row)} /> },
    { key: 'total', label: 'Total', align: 'right', sortable: true, render: (row) => (
      <span className="mono">{formatMoney(row.total, row.currency)}</span>
    ) },
    { key: 'actions', label: 'Actions', align: 'right', render: (row) => (
      <div className="table__actions">
        {row.status === 'draft' && (
          <IconButton size="sm" onClick={() => markSent(row)} aria-label="Mark sent" title="Mark sent">
            <Send size={14} />
          </IconButton>
        )}
        {row.status !== 'paid' && (
          <IconButton size="sm" onClick={() => markPaid(row)} aria-label="Mark paid" title="Mark paid">
            <Check size={14} />
          </IconButton>
        )}
        <IconButton size="sm" onClick={() => duplicateRow(row)} aria-label="Duplicate" title="Duplicate">
          <Copy size={14} />
        </IconButton>
        <IconButton
          size="sm"
          onClick={() => downloadPdf(row)}
          aria-label="Download PDF"
          title="Download PDF"
          disabled={pdfLoadingId === row.id}
        >
          {pdfLoadingId === row.id ? <LoadingSpinner size="xs" label="Downloading PDF..." /> : <Download size={14} />}
        </IconButton>
        <IconButton as={Link} size="sm" to={`/app/invoices/${row.id}/edit`} aria-label="Edit" title="Edit">
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
    ) },
  ];

  const clientPrepared = useMemo(
    () => filteredInvoices.map((invoice) => ({ ...invoice, client_name: invoice.clients?.company || invoice.clients?.name || '' })),
    [filteredInvoices]
  );

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
          <h2 className="heading-xl">Create, send, and track client invoices.</h2>
        </div>
        <Button as={Link} variant="primary" to="/app/invoices/new" leftIcon={<Plus size={16} />}>
          New invoice
        </Button>
      </div>

      {error && <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card>}

      <Card variant="default">
        <div className="filters-row">
          <Input
            placeholder="Search invoice number or client"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leftIcon={<Search size={16} />}
          />
          <Select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            options={STATUS_OPTIONS}
            placeholder="All statuses"
          />
        </div>

        {selectedKeys.length > 0 && (
          <div className="bulk-actions-bar">
            <span className="bulk-actions-bar__label">{selectedKeys.length} selected</span>
            <div className="bulk-actions-bar__actions">
              <Button variant="secondary" size="sm" onClick={bulkMarkPaid} disabled={actionLoading}>
                Mark paid
              </Button>
              <Button variant="danger" size="sm" onClick={() => setBulkDeleteOpen(true)} disabled={actionLoading}>
                Delete
              </Button>
            </div>
          </div>
        )}

        <Table
          columns={columns}
          data={clientPrepared}
          keyExtractor={(row) => row.id}
          sortable
          selectable
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          pagination
          pageSize={10}
          onRowClick={(row) => navigate(`/app/invoices/${row.id}`)}
          emptyTitle="No invoices yet"
          emptyMessage="Create an invoice with line items, taxes, and due dates."
          emptyAction={{
            label: 'Create invoice',
            to: '/app/invoices/new',
          }}
          emptyIcon={<EmptyStateIllustration variant="document" />}
        />
      </Card>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete invoice"
        message={deleteTarget ? `Delete invoice ${deleteTarget.invoice_number}? This can't be undone.` : ''}
        confirmLabel="Delete"
        loading={actionLoading}
      />

      <ConfirmDialog
        isOpen={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={confirmBulkDelete}
        title="Delete invoices"
        message={`Delete ${selectedKeys.length} selected invoice${selectedKeys.length === 1 ? '' : 's'}? This can't be undone.`}
        confirmLabel="Delete"
        loading={actionLoading}
      />
    </div>
  );
}
