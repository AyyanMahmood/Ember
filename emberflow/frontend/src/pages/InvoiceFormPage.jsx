import { LayoutTemplate, Minus, Plus } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Input, Select, Textarea } from '../components/ui/Input.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { createInvoice, getInvoice, getProfile, listClients, updateInvoice } from '../services/api.js';
import { formatMoney, addDaysISO, todayISO } from '../utils/format.js';
import { CURRENCIES, INVOICE_STATUSES, calculateInvoiceTotals, nextInvoiceNumber, normalizeInvoiceItems } from '../utils/invoice.js';
import { InvoiceDocument } from '../document-studio/InvoiceDocument.jsx';
import { ScaledPreview } from '../document-studio/ScaledPreview.jsx';
import { TemplateSelector } from '../document-studio/TemplateSelector.jsx';
import { ExportMenu } from '../document-studio/ExportMenu.jsx';
import { useDocumentExport } from '../document-studio/useDocumentExport.js';
import { DEFAULT_THEME_ID, getTheme } from '../document-studio/themes.js';

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
    template: DEFAULT_THEME_ID,
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
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(buildInitialForm(params.get('client') || ''));
  const [items, setItems] = useState([{ ...emptyItem }]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [focusItemIndex, setFocusItemIndex] = useState(null);
  const descriptionRefs = useRef([]);
  const documentRef = useRef(null);

  useEffect(() => {
    if (focusItemIndex !== null && descriptionRefs.current[focusItemIndex]) {
      descriptionRefs.current[focusItemIndex].focus();
      setFocusItemIndex(null);
    }
  }, [focusItemIndex, items.length]);

  useEffect(() => {
    async function load() {
      try {
        const [clientRows, profileRow] = await Promise.all([listClients(), getProfile()]);
        setClients(clientRows);
        setProfile(profileRow);
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
            template: invoice.template || DEFAULT_THEME_ID,
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
          setForm(buildInitialForm(params.get('client') || '', profileRow.invoice_prefix, profileRow.currency));
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

  const selectedClient = useMemo(() => clients.find((c) => c.id === form.client_id), [clients, form.client_id]);

  const previewInvoice = useMemo(() => ({
    invoice_number: form.invoice_number,
    invoice_date: form.invoice_date,
    due_date: form.due_date,
    currency: form.currency,
    status: form.status,
    notes: form.notes,
    template: form.template,
    subtotal: totals.subtotal,
    tax_total: totals.tax_total,
    discount_total: totals.discount_total,
    total: totals.total,
    invoice_items: items,
    payments: [],
    clients: selectedClient ? { name: selectedClient.name, company: selectedClient.company, email: selectedClient.email } : null,
  }), [form, totals, items, selectedClient]);

  const { exportBusy, handleExport } = useDocumentExport({
    kind: 'invoice',
    documentRef,
    filename: form.invoice_number,
    data: previewInvoice,
    profile,
    onError: setError,
  });

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateItem(index, field, value) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item))
    );
  }

  function addItem() {
    setItems((current) => {
      const next = [...current, { ...emptyItem }];
      setFocusItemIndex(next.length - 1);
      return next;
    });
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

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading invoice..." />
      </div>
    );
  }

  const theme = getTheme(form.template);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">{editing ? 'Edit invoice' : 'New invoice'}</p>
          <h2 className="heading-xl">{editing ? 'Update invoice details.' : 'Create a professional itemized invoice.'}</h2>
        </div>
      </div>

      <div className="studio-toolbar">
        <Button
          variant="secondary"
          type="button"
          leftIcon={<LayoutTemplate size={16} />}
          onClick={() => setTemplateOpen(true)}
        >
          Template: {theme.name}{theme.isPremium && !subscription.isPro ? ' (Pro)' : ''}
        </Button>
        <div className="studio-toolbar__actions">
          <ExportMenu
            isPro={subscription.isPro}
            busyFormat={exportBusy}
            onExport={handleExport}
            onRequestUpgrade={() => setUpgradeOpen(true)}
          />
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <form onSubmit={handleSubmit}>
        <div className="studio-layout">
          <div className="studio-editor">
            <Card variant="default">
              <div className="form-grid">
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
              </div>
            </Card>

            <Card variant="default">
              <div className="items-editor">
                <div className="panel__header">
                  <h3>Items</h3>
                  <Button variant="ghost" size="sm" type="button" onClick={addItem} leftIcon={<Plus size={15} />}>Add item</Button>
                </div>
                <div className="item-row item-row--header" aria-hidden="true">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Price</span>
                  <span>Tax %</span>
                  <span>Line total</span>
                  <span />
                </div>
                {items.map((item, index) => {
                  const isLast = index === items.length - 1;
                  const lineTotal = Number(item.quantity || 0) * Number(item.price || 0) * (1 + Number(item.tax_rate || 0) / 100);
                  return (
                    <div className="item-row" key={`${index}-${item.description}`}>
                      <Input
                        ref={(el) => { descriptionRefs.current[index] = el; }}
                        aria-label="Description"
                        placeholder="Description"
                        required
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                      />
                      <Input aria-label="Quantity" placeholder="Qty" required type="number" min="0" step="0.01" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)} />
                      <Input aria-label="Price" placeholder="Price" required type="number" min="0" step="0.01" value={item.price} onChange={(e) => updateItem(index, 'price', e.target.value)} />
                      <Input
                        aria-label="Tax percent"
                        placeholder="Tax %"
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.tax_rate}
                        onChange={(e) => updateItem(index, 'tax_rate', e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && isLast) {
                            e.preventDefault();
                            addItem();
                          }
                        }}
                      />
                      <span className="item-row__total mono">{formatMoney(lineTotal, form.currency)}</span>
                      <IconButton
                        size="sm"
                        className="icon-button--danger"
                        onClick={() => removeItem(index)}
                        aria-label="Remove item"
                        title="Remove item"
                        disabled={items.length === 1}
                      >
                        <Minus size={16} />
                      </IconButton>
                    </div>
                  );
                })}
              </div>

              <div className="totals-box totals-box--sticky">
                <span>Subtotal {formatMoney(totals.subtotal, form.currency)}</span>
                <span>Tax {formatMoney(totals.tax_total, form.currency)}</span>
                <span>Discount {formatMoney(totals.discount_total, form.currency)}</span>
                <strong>Total {formatMoney(totals.total, form.currency)}</strong>
              </div>
            </Card>

            <div className="form-actions">
              <Button as={Link} variant="ghost" to="/app/invoices">Cancel</Button>
              <Button variant="primary" disabled={saving} type="submit">
                {saving ? 'Saving...' : 'Save invoice'}
              </Button>
            </div>
          </div>

          <div className="studio-preview">
            <div className="studio-preview__surface">
              <ScaledPreview>
                <InvoiceDocument ref={documentRef} invoice={previewInvoice} profile={profile} themeId={form.template} />
              </ScaledPreview>
            </div>
          </div>
        </div>
      </form>

      <TemplateSelector
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        kind="invoice"
        data={previewInvoice}
        profile={profile}
        value={form.template}
        onChange={(themeId) => updateField('template', themeId)}
        isPro={subscription.isPro}
        onRequestUpgrade={() => { setTemplateOpen(false); setUpgradeOpen(true); }}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="Premium templates and advanced export formats are included in EmberFlow Pro."
      />
    </div>
  );
}
