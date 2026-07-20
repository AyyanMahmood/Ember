import { Check, Copy, Download, Edit, Send, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { createPayment, deleteInvoice, deletePayment, duplicateInvoice, getInvoice, getProfile, updateInvoiceStatus } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus, nextInvoiceNumber } from '../utils/invoice.js';
import { exportInvoicePdf } from '../utils/pdf.js';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscription = useSubscription();
  const [invoice, setInvoice] = useState(null);
  const [profile, setProfile] = useState(null);
  const [payment, setPayment] = useState({
    amount: '',
    payment_date: new Date().toISOString().slice(0, 10),
    method: 'manual',
    reference: '',
    notes: '',
  });
  const [loading, setLoading] = useState(true);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

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

  async function markSent() {
    try {
      await updateInvoiceStatus(id, 'sent');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function duplicateCurrentInvoice() {
    try {
      const copied = await duplicateInvoice(id, user.id, nextInvoiceNumber(profile?.invoice_prefix || 'INV'));
      navigate(`/app/invoices/${copied.id}`);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handlePaymentSubmit(event) {
    event.preventDefault();
    if (!subscription.isPro) {
      setUpgradeOpen(true);
      return;
    }
    setSavingPayment(true);
    setError('');
    try {
      await createPayment({
        user_id: user.id,
        invoice_id: id,
        amount: Number(payment.amount || 0),
        currency: invoice.currency,
        payment_date: payment.payment_date,
        method: payment.method,
        reference: payment.reference,
        notes: payment.notes,
      });
      setPayment({
        amount: '',
        payment_date: new Date().toISOString().slice(0, 10),
        method: 'manual',
        reference: '',
        notes: '',
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingPayment(false);
    }
  }

  async function removePayment(paymentRow) {
    if (!window.confirm('Delete this payment record?')) return;
    try {
      await deletePayment(paymentRow.id, id);
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

  if (loading) return <Card variant="default">Loading invoice...</Card>;
  if (error) return <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card>;

  const paidAmount = (invoice.payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const balanceDue = Math.max(Number(invoice.total || 0) - paidAmount, 0);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Invoice</p>
          <h2 className="heading-xl">{invoice.invoice_number}</h2>
        </div>
        <div className="actions">
          {invoice.status === 'draft' ? (
            <Button variant="ghost" onClick={markSent} leftIcon={<Send size={16} />}>
              Mark sent
            </Button>
          ) : null}
          {invoice.status !== 'paid' ? (
            <Button variant="ghost" onClick={markPaid} leftIcon={<Check size={16} />}>
              Mark paid
            </Button>
          ) : null}
          <Button variant="ghost" onClick={duplicateCurrentInvoice} leftIcon={<Copy size={16} />}>
            Duplicate
          </Button>
          <Button variant="ghost" onClick={() => exportInvoicePdf(invoice, profile).catch((err) => setError(err.message))} leftIcon={<Download size={16} />}>
            PDF
          </Button>
          <Button as={Link} variant="ghost" to={`/app/invoices/${id}/edit`} leftIcon={<Edit size={16} />}>
            Edit
          </Button>
          <Button variant="danger" onClick={handleDelete} leftIcon={<Trash2 size={16} />}>
            Delete
          </Button>
        </div>
      </div>

      <Card variant="default" className="invoice-preview">
        <div className="invoice-head">
          <div>
            <h3>{profile?.business_name || profile?.full_name || 'Freelancer'}</h3>
            <p>{profile?.email}</p>
          </div>
          <StatusBadge status={effectiveStatus(invoice)} />
        </div>
        <div className="detail-grid">
          <div>
            <p className="eyebrow">Bill to</p>
            <h3>{invoice.clients?.name}</h3>
            <p>{invoice.clients?.company}</p>
            <p>{invoice.clients?.email}</p>
          </div>
          <dl className="details-list--compact">
            <dt>Invoice date</dt>
            <dd>{formatDate(invoice.invoice_date)}</dd>
            <dt>Due date</dt>
            <dd>{formatDate(invoice.due_date)}</dd>
            <dt>Currency</dt>
            <dd>{invoice.currency}</dd>
          </dl>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Item</th>
                <th className="table__cell--right">Qty</th>
                <th className="table__cell--right">Price</th>
                <th className="table__cell--right">Tax</th>
                <th className="table__cell--right">Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.invoice_items.map((item) => {
                const subtotal = Number(item.quantity) * Number(item.price);
                const tax = subtotal * (Number(item.tax_rate) / 100);
                return (
                  <tr key={item.id}>
                    <td>{item.description}</td>
                    <td className="table__cell--right">{item.quantity}</td>
                    <td className="table__cell--right">{formatMoney(item.price, invoice.currency)}</td>
                    <td className="table__cell--right">{Number(item.tax_rate).toFixed(2)}%</td>
                    <td className="table__cell--right">{formatMoney(subtotal + tax, invoice.currency)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="invoice-totals">
          <span>Paid {formatMoney(paidAmount, invoice.currency)}</span>
          <span>Balance {formatMoney(balanceDue, invoice.currency)}</span>
          <span>Subtotal {formatMoney(invoice.subtotal, invoice.currency)}</span>
          <span>Tax {formatMoney(invoice.tax_total, invoice.currency)}</span>
          <span>Discount {formatMoney(invoice.discount_total || 0, invoice.currency)}</span>
          <strong>Total {formatMoney(invoice.total, invoice.currency)}</strong>
        </div>
      </Card>

      <Card variant="default">
        <div className="panel__header">
          <h3 className="panel__title">Payments</h3>
          <span className="muted small">Balance due {formatMoney(balanceDue, invoice.currency)}</span>
        </div>
        {subscription.isPro ? (
          <form className="payment-form" onSubmit={handlePaymentSubmit}>
            <Input label="Amount" type="number" required min="0.01" step="0.01" value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })} />
            <Input label="Date" type="date" required value={payment.payment_date} onChange={(e) => setPayment({ ...payment, payment_date: e.target.value })} />
            <Select label="Method" value={payment.method} onChange={(e) => setPayment({ ...payment, method: e.target.value })} options={[
              { value: 'manual', label: 'Manual' },
              { value: 'bank_transfer', label: 'Bank transfer' },
              { value: 'card', label: 'Card' },
              { value: 'cash', label: 'Cash' },
              { value: 'other', label: 'Other' },
            ]} />
            <Input label="Reference" value={payment.reference} onChange={(e) => setPayment({ ...payment, reference: e.target.value })} />
            <Input label="Notes" value={payment.notes} onChange={(e) => setPayment({ ...payment, notes: e.target.value })} className="span-2" />
            <Button variant="primary" disabled={savingPayment} type="submit">
              {savingPayment ? 'Recording...' : 'Record payment'}
            </Button>
          </form>
        ) : (
          <div className="upgrade-inline">
            <p className="muted">Payment tracking is included in EmberFlow Pro.</p>
            <Button variant="primary" type="button" onClick={() => setUpgradeOpen(true)}>
              Upgrade to Pro
            </Button>
          </div>
        )}

        {(invoice.payments || []).length === 0 ? (
          <p className="muted">No payments recorded yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th className="table__cell--right">Amount</th>
                  <th className="table__cell--right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.payment_date)}</td>
                    <td>{row.method}</td>
                    <td>{row.reference || '-'}</td>
                    <td className="table__cell--right">{formatMoney(row.amount, row.currency)}</td>
                    <td className="table__cell--right">
                      <Button variant="danger" size="sm" onClick={() => removePayment(row)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="Payment tracking is available on EmberFlow Pro."
      />
    </div>
  );
}
