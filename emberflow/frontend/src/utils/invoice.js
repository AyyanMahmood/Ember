export const INVOICE_STATUSES = ['draft', 'sent', 'paid', 'overdue'];
export const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'PKR', 'INR'];

export function normalizeInvoiceItems(items) {
  return items
    .map((item) => ({
      description: item.description.trim(),
      quantity: Number(item.quantity || 0),
      price: Number(item.price || 0),
      tax_rate: Number(item.tax_rate || 0),
    }))
    .filter((item) => item.description && item.quantity > 0);
}

export function calculateInvoiceTotals(items) {
  return normalizeInvoiceItems(items).reduce(
    (totals, item) => {
      const lineSubtotal = item.quantity * item.price;
      const lineTax = lineSubtotal * (item.tax_rate / 100);
      return {
        subtotal: totals.subtotal + lineSubtotal,
        tax_total: totals.tax_total + lineTax,
        total: totals.total + lineSubtotal + lineTax,
      };
    },
    { subtotal: 0, tax_total: 0, total: 0 }
  );
}

export function effectiveStatus(invoice) {
  if (!invoice) return 'draft';
  if (invoice.status === 'paid' || invoice.status === 'draft') return invoice.status;
  if (invoice.due_date && new Date(`${invoice.due_date}T23:59:59`) < new Date()) return 'overdue';
  return invoice.status;
}

export function nextInvoiceNumber() {
  const compactDate = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  return `INV-${compactDate}-${Math.floor(1000 + Math.random() * 9000)}`;
}
