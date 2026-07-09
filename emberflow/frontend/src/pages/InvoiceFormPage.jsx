import { Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { createInvoice, getInvoice, getProfile, listClients, updateInvoice } from '../services/api.js';
import { formatMoney, addDaysISO, todayISO } from '../utils/format.js';
import { CURRENCIES, INVOICE_STATUSES, calculateInvoiceTotals, nextInvoiceNumber, normalizeInvoiceItems } from '../utils/invoice.js';

const emptyItem = { description: '', quantity: 1, price: 0, tax_rate: 0 };

function buildInitialForm(clientId = '', prefix = 'INV', currency = 'USD') {
  return {
    invoice_number: nextInvoiceNumber(prefix),
    client_id: clientId,
    invoice_date: todayISO(),
    due_date: addDaysISO(14),
    currency,
    status: 'draft',
    discount_total: 0,
    notes: '',
  };
}

export default function InvoiceFormPage() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const { user } = useAuth();
  const subscription = useSubscription();
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(buildInitialForm(params.get('client') || ''));
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [clientRows, profile] = await Promise.all([listClients(), getProfile()]);
        setClients(clientRows);
        if (editing) {
          const invoice = await getInvoice(id);
          setForm({
            invoice_number: invoice.invoice_number,
            client_id: invoice.client_id,
            invoice_date: invoice.invoice_date,
            due_date: invoice.due_date,
            currency: invoice.currency,
            status: invoice.status,
            discount_total: invoice.discount_total || 0,
            notes: invoice.notes || '',
          });
          setItems(
            invoice.invoice_items.length > 0
              ? invoice.invoice_items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  price: item.price,
                  tax_rate: item.tax_rate,
                }))
              : [{ ...emptyItem }]
          );
        } else {
          setForm(buildInitialForm(params.get('client') || '', profile.invoice_prefix, profile.currency));
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [editing, id]);

  const totals = useMemo(() => calculateInvoiceTotals(items, form.discount_total), [items, form.discount_total]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((current) => [...current, { ...emptyItem }]);
  }

  function removeItem(index) {
    setItems((current) => (current.length === 1 ? current : current.filter((_item, itemIndex) => itemIndex !== index)));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    const normalizedItems = normalizeInvoiceItems(items);
    if (normalizedItems.length === 0) {
      setError('Add at least one invoice item with a description and quantity.');
      setSaving(false);
      return;
    }

    try {
      if (!editing && !subscription.canCreateInvoice) {
        setUpgradeOpen(true);
        setSaving(false);
        return;
      }

      const payload = {
        ...form,
        user_id: user.id,
        subtotal: totals.subtotal,
        tax_total: totals.tax_total,
        discount_total: totals.discount_total,
        total: totals.total,
      };
      const saved = editing ? await updateInvoice(id, payload, normalizedItems) : await createInvoice(payload, normalizedItems);
      navigate(`/app/invoices/${saved.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="panel">Loading invoice...</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">{editing ? 'Edit invoice' : 'New invoice'}</p>
          <h2>{editing ? 'Update invoice details.' : 'Create a professional itemized invoice.'}</h2>
        </div>
      </div>
      <form className="panel form-grid" onSubmit={handleSubmit}>
        {error ? <p className="form-error span-2">{error}</p> : null}
        <label>
          Invoice number
          <input required value={form.invoice_number} onChange={(event) => updateField('invoice_number', event.target.value)} />
        </label>
        <label>
          Client
          <select required value={form.client_id} onChange={(event) => updateField('client_id', event.target.value)}>
            <option value="">Select client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.company || client.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Invoice date
          <input type="date" required value={form.invoice_date} onChange={(event) => updateField('invoice_date', event.target.value)} />
        </label>
        <label>
          Due date
          <input type="date" required value={form.due_date} onChange={(event) => updateField('due_date', event.target.value)} />
        </label>
        <label>
          Currency
          <select value={form.currency} onChange={(event) => updateField('currency', event.target.value)}>
            {CURRENCIES.map((currency) => (
              <option key={currency} value={currency}>
                {currency}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={form.status} onChange={(event) => updateField('status', event.target.value)}>
            {INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          Discount
          <input
            min="0"
            step="0.01"
            type="number"
            value={form.discount_total}
            onChange={(event) => updateField('discount_total', event.target.value)}
          />
        </label>
        <label className="span-2">
          Notes
          <textarea rows="4" value={form.notes} onChange={(event) => updateField('notes', event.target.value)} />
        </label>

        <div className="span-2 items-editor">
          <div className="panel-header">
            <h3>Items</h3>
            <button type="button" className="button ghost small" onClick={addItem}>
              <Plus size={15} />
              Add item
            </button>
          </div>
          {items.map((item, index) => (
            <div className="item-row" key={`${index}-${item.description}`}>
              <label>
                Description
                <input
                  required
                  value={item.description}
                  onChange={(event) => updateItem(index, 'description', event.target.value)}
                />
              </label>
              <label>
                Qty
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, 'quantity', event.target.value)}
                />
              </label>
              <label>
                Price
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={item.price}
                  onChange={(event) => updateItem(index, 'price', event.target.value)}
                />
              </label>
              <label>
                Tax %
                <input
                  min="0"
                  step="0.01"
                  type="number"
                  value={item.tax_rate}
                  onChange={(event) => updateItem(index, 'tax_rate', event.target.value)}
                />
              </label>
              <button type="button" className="icon-button item-remove" onClick={() => removeItem(index)} aria-label="Remove item">
                <Minus size={16} />
              </button>
            </div>
          ))}
        </div>

        <div className="totals-box span-2">
          <span>Subtotal {formatMoney(totals.subtotal, form.currency)}</span>
          <span>Tax {formatMoney(totals.tax_total, form.currency)}</span>
          <span>Discount {formatMoney(totals.discount_total, form.currency)}</span>
          <strong>Total {formatMoney(totals.total, form.currency)}</strong>
        </div>

        <div className="form-actions span-2">
          <Link className="button ghost" to="/app/invoices">
            Cancel
          </Link>
          <button className="button primary" disabled={saving} type="submit">
            {saving ? 'Saving...' : 'Save invoice'}
          </button>
        </div>
      </form>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="The Free plan includes 5 invoices per month. Upgrade to Pro for unlimited invoices."
      />
    </div>
  );
}
