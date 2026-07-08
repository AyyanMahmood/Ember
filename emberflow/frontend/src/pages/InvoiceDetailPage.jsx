import { Download, Edit, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import StatusBadge from '../components/StatusBadge.jsx';
import { deleteInvoice, getInvoice, getProfile, updateInvoiceStatus } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { exportInvoicePdf } from '../utils/pdf.js';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [invoiceRow, profileRow] = await Promise.all([getInvoice(id), getProfile()]);
      setInvoice(invoiceRow);
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
  }, [id]);

  async function markPaid() {
    try {
      await updateInvoiceStatus(id, 'paid');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete invoice ${invoice.invoice_number}?`)) return;
    try {
      await deleteInvoice(id);
      navigate('/app/invoices');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="panel">Loading invoice...</div>;
  if (error) return <div className="panel error-panel">{error}</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Invoice</p>
          <h2>{invoice.invoice_number}</h2>
        </div>
        <div className="actions">
          {invoice.status !== 'paid' ? (
            <button className="button ghost" onClick={markPaid}>
              Mark paid
            </button>
          ) : null}
          <button className="button ghost" onClick={() => exportInvoicePdf(invoice, profile)}>
            <Download size={16} />
            PDF
          </button>
          <Link className="button ghost" to={`/app/invoices/${id}/edit`}>
            <Edit size={16} />
            Edit
          </Link>
          <button className="button danger" onClick={handleDelete}>
            <Trash2 size={16} />
            Delete
          </button>
        </div>
      </div>

      <section className="invoice-preview panel">
        <div className="invoice-head">
          <div>
            <h3>{profile?.business_name || profile?.full_name || 'Freelancer'}</h3>
            <p>{profile?.email}</p>
          </div>
          <StatusBadge invoice={invoice} />
        </div>
        <div className="detail-grid">
          <div>
            <p className="eyebrow">Bill to</p>
            <h3>{invoice.clients?.name}</h3>
            <p>{invoice.clients?.company}</p>
            <p>{invoice.clients?.email}</p>
          </div>
          <dl className="details-list compact">
            <dt>Invoice date</dt>
            <dd>{formatDate(invoice.invoice_date)}</dd>
            <dt>Due date</dt>
            <dd>{formatDate(invoice.due_date)}</dd>
            <dt>Currency</dt>
            <dd>{invoice.currency}</dd>
          </dl>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="right">Qty</th>
                <th className="right">Price</th>
                <th className="right">Tax</th>
                <th className="right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item) => {
                const subtotal = Number(item.quantity) * Number(item.price);
                const tax = subtotal * (Number(item.tax_rate) / 100);
                return (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="right">{item.quantity}</td>
                    <td className="right">{formatMoney(item.price, invoice.currency)}</td>
                    <td className="right">{Number(item.tax_rate).toFixed(2)}%</td>
                    <td className="right">{formatMoney(subtotal + tax, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="invoice-totals">
          <span>Subtotal {formatMoney(invoice.subtotal, invoice.currency)}</span>
          <span>Tax {formatMoney(invoice.tax_total, invoice.currency)}</span>
          <strong>Total {formatMoney(invoice.total, invoice.currency)}</strong>
        </div>
      </section>
    </div>
  );
}
