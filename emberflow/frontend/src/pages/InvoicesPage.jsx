import { Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { deleteInvoice, listInvoices, updateInvoiceStatus } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';

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

  async function handleDelete(invoice) {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    try {
      await deleteInvoice(invoice.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="panel">Loading invoices...</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Invoices</p>
          <h2>Create, send, and track client invoices.</h2>
        </div>
        <Link className="button primary" to="/app/invoices/new">
          <Plus size={16} />
          New invoice
        </Link>
      </div>

      {error ? <div className="panel error-panel">{error}</div> : null}
      <section className="panel">
        {invoices.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            message="Create an invoice with line items, taxes, and due dates."
            actionLabel="Create invoice"
            actionTo="/app/invoices/new"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Issued</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="right">Total</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link to={`/app/invoices/${invoice.id}`}>{invoice.invoice_number}</Link>
                    </td>
                    <td>{invoice.clients?.company || invoice.clients?.name || '-'}</td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>
                      <StatusBadge invoice={invoice} />
                    </td>
                    <td className="right">{formatMoney(invoice.total, invoice.currency)}</td>
                    <td className="right actions">
                      {invoice.status !== 'paid' ? (
                        <button className="button small ghost" onClick={() => markPaid(invoice)}>
                          Mark paid
                        </button>
                      ) : null}
                      <Link className="button small ghost" to={`/app/invoices/${invoice.id}/edit`}>
                        Edit
                      </Link>
                      <button className="button small danger" onClick={() => handleDelete(invoice)}>
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
