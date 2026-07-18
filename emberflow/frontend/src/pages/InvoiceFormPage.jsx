import { Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
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
      <Card variant="default">
        <form className="form-grid" onSubmit={handleSubmit}>
          {error ? <p className="form-error span-2">{error}</p> : null}
          <Input label="Invoice number" required value={form.invoice_number} onChange={(e) => updateField('invoice_number', e.target.value)} />
          <Select label="Client" required value={form.client_id} onChange={(e) => updateField('client_id', e.target.value)} options={[
            { value: '', label: 'Select client' },
            ...clients.map((client) => ({ value: client.id, label: client.company || client.name })),
          ]} />
          <Input label="Invoice date" type="date" required value={form.invoice_date} onChange={(e) => updateField('invoice_date', e.target.value)} />
          <Input label="Due date" type="date" required value={form.due_date} onChange={(e) => updateField('due_date', e.target.value)} />
          <Select label="Currency" value={form.currency} onChange={(e) => updateField('currency', e.target.value)} options={CURRENCIES.map((c) => ({ value: c, label: c }))} />
          <Select label="Status" value={form.status} onChange={(e) => updateField('status', e.target.value)} options={INVOICE_STATUSES.map((s) => ({ value: s, label: s }))} />
          <Input label="Discount" type="number" min="0" step="0.01" value={form.discount_total} onChange={(e) => updateField('discount_total', e.target.value)} />
          <Textarea label="Notes" rows={4} className="span-2" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />

          <div className="span-2 items-editor">
            <div className="panel-header">
              <h3>Items</h3>
              <Button variant="ghost" size="sm" type="button" onClick={addItem} leftIcon={<Plus size={15} />}>Add item</Button>
            </div>
            {items.map((item, index) => (
              <div className="item-row" key={`${index}-${item.description}`}>
                <Input label="Description" required value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)} />
                <Input label="Qty" required type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                <Input label="Price" required type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} />
                <Input label="Tax %" type="number" min="0" step="0.01" value={item.tax_rate} onChange={(e) => updateItem(index, 'tax_rate', e.target.value)} />
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
            <Button as={Link} variant="ghost" to="/app/invoices">Cancel</Button>
            <Button variant="primary" disabled={saving} type="submit">
              {saving ? 'Saving...' : 'Save invoice'}
            </Button>
          </div>
        </form>
      </Card>
      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="The Free plan includes 5 invoices per month. Upgrade to Pro for unlimited invoices."
      />
    </div>
  );
}
