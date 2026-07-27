import { Check, Copy, Edit, LayoutTemplate, Send, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { Input, Select } from '../components/ui/Input.jsx';
import { Table } from '../components/ui/Table.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import UpgradeModal from '../components/UpgradeModal.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { createPayment, deleteInvoice, deletePayment, duplicateInvoice, getInvoice, getProfile, updateInvoice, updateInvoiceStatus } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { nextInvoiceNumber } from '../utils/invoice.js';
import { InvoiceDocument } from '../document-studio/InvoiceDocument.jsx';
import { ScaledPreview } from '../document-studio/ScaledPreview.jsx';
import { TemplateSelector } from '../document-studio/TemplateSelector.jsx';
import { ExportMenu } from '../document-studio/ExportMenu.jsx';
import { useDocumentExport } from '../document-studio/useDocumentExport.js';
import { getTheme } from '../document-studio/themes.js';

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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [paymentDeleteTarget, setPaymentDeleteTarget] = useState(null);
  const [deletingPayment, setDeletingPayment] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [changingTemplate, setChangingTemplate] = useState(false);
  const documentRef = useRef(null);

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

  async function confirmRemovePayment() {
    if (!paymentDeleteTarget) return;
    setDeletingPayment(true);
    try {
      await deletePayment(paymentDeleteTarget.id, id);
      setPaymentDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingPayment(false);
    }
  }

  async function changeTemplate(templateId) {
    setChangingTemplate(true);
    try {
      const items = invoice.invoice_items.map((item) => ({
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        tax_rate: item.tax_rate,
      }));
      const updated = await updateInvoice(id, {
        client_id: invoice.client_id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        due_date: invoice.due_date,
        currency: invoice.currency,
        status: invoice.status,
        discount_total: invoice.discount_total,
        notes: invoice.notes,
        subtotal: invoice.subtotal,
        tax_total: invoice.tax_total,
        total: invoice.total,
        template: templateId,
      }, items);
      setInvoice(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setChangingTemplate(false);
    }
  }

  const { exportBusy, handleExport } = useDocumentExport({
    kind: 'invoice',
    documentRef,
    filename: invoice?.invoice_number,
    data: invoice,
    profile,
    onError: setError,
  });

  async function confirmDelete() {
    setDeleting(true);
    try {
      await deleteInvoice(id);
      navigate('/app/invoices');
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading invoice..." />
      </div>
    );
  }
  if (error) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Invoice</p>
            <h2 className="heading-xl">Something went wrong.</h2>
          </div>
          <Button as={Link} variant="ghost" to="/app/invoices">Back to invoices</Button>
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

  const paidAmount = (invoice.payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const balanceDue = Math.max(Number(invoice.total || 0) - paidAmount, 0);
  const canMarkSent = invoice.status === 'draft';
  const canMarkPaid = invoice.status !== 'paid';

  const theme = getTheme(invoice.template);

  const paymentColumns = [
    { key: 'payment_date', label: 'Date', render: (row) => formatDate(row.payment_date) },
    { key: 'method', label: 'Method' },
    { key: 'reference', label: 'Reference', render: (row) => row.reference || '-' },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.amount, row.currency) },
    {
      key: 'actions', label: 'Actions', align: 'right', render: (row) => (
        <IconButton
          size="sm"
          className="icon-button--danger"
          onClick={() => setPaymentDeleteTarget(row)}
          aria-label="Delete payment"
          title="Delete payment"
        >
          <Trash2 size={14} />
        </IconButton>
      ),
    },
  ];

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Invoice</p>
          <h2 className="heading-xl">{invoice.invoice_number}</h2>
        </div>
        <div className="actions">
          {canMarkSent && (
            <Button variant="primary" onClick={markSent} leftIcon={<Send size={16} />}>
              Mark sent
            </Button>
          )}
          {canMarkPaid && (
            <Button variant={canMarkSent ? 'secondary' : 'primary'} onClick={markPaid} leftIcon={<Check size={16} />}>
              Mark paid
            </Button>
          )}
          <Button variant="secondary" onClick={duplicateCurrentInvoice} leftIcon={<Copy size={16} />}>
            Duplicate
          </Button>
          <Button as={Link} variant="secondary" to={`/app/invoices/${id}/edit`} leftIcon={<Edit size={16} />}>
            Edit
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)} leftIcon={<Trash2 size={16} />}>
            Delete
          </Button>
        </div>
      </div>

      <div className="studio-toolbar">
        <Button
          variant="secondary"
          type="button"
          leftIcon={<LayoutTemplate size={16} />}
          onClick={() => setTemplateOpen(true)}
          disabled={changingTemplate}
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

      <Card variant="default">
        <div className="studio-preview__surface">
          <ScaledPreview>
            <InvoiceDocument ref={documentRef} invoice={invoice} profile={profile} themeId={invoice.template} />
          </ScaledPreview>
        </div>
      </Card>

      <Card variant="default">
        <CardHeader
          title="Payments"
          action={<span className="muted small">Balance due {formatMoney(balanceDue, invoice.currency)}</span>}
        />
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

        <Table
          columns={paymentColumns}
          data={invoice.payments || []}
          keyExtractor={(row) => row.id}
          emptyTitle="No payments yet"
          emptyMessage="Payments recorded against this invoice will show up here."
        />
      </Card>

      <TemplateSelector
        isOpen={templateOpen}
        onClose={() => setTemplateOpen(false)}
        kind="invoice"
        data={invoice}
        profile={profile}
        value={invoice.template}
        onChange={changeTemplate}
        isPro={subscription.isPro}
        onRequestUpgrade={() => { setTemplateOpen(false); setUpgradeOpen(true); }}
      />

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        reason="Payment tracking, premium templates, and advanced export formats are available on EmberFlow Pro."
      />

      <ConfirmDialog
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={confirmDelete}
        title="Delete invoice"
        message={`Delete invoice ${invoice.invoice_number}? This can't be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />

      <ConfirmDialog
        isOpen={Boolean(paymentDeleteTarget)}
        onClose={() => setPaymentDeleteTarget(null)}
        onConfirm={confirmRemovePayment}
        title="Delete payment"
        message="Delete this payment record? This can't be undone."
        confirmLabel="Delete"
        loading={deletingPayment}
      />
    </div>
  );
}
