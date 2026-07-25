import { calculateInvoiceTotals } from '../utils/invoice.js';

// Fixed sample content shared by Brand Studio and the Templates page --
// both preview a document without ever editing a real one, so this never
// touches invoices/proposals API or business logic.
const SAMPLE_ITEMS = [
  { id: 'demo-1', description: 'Brand strategy workshop', quantity: 1, price: 1800, tax_rate: 0 },
  { id: 'demo-2', description: 'Website redesign — 5 pages', quantity: 1, price: 3200, tax_rate: 8 },
  { id: 'demo-3', description: 'Monthly retainer', quantity: 2, price: 450, tax_rate: 8 },
];

function buildSampleInvoice() {
  const totals = calculateInvoiceTotals(SAMPLE_ITEMS, 0);
  return {
    invoice_number: 'INV-1042',
    invoice_date: '2026-07-01',
    due_date: '2026-07-15',
    currency: 'USD',
    status: 'sent',
    notes: 'Thanks for your business — let me know if you have any questions.',
    invoice_items: SAMPLE_ITEMS,
    payments: [],
    clients: { name: 'Nova Studio', company: 'Nova Studio LLC', email: 'hello@novastudio.co' },
    ...totals,
  };
}

export const SAMPLE_INVOICE = buildSampleInvoice();

export const SAMPLE_PROPOSAL = {
  title: 'Brand & Website Refresh',
  client_name: 'Nova Studio',
  currency: 'USD',
  timeline: '6 weeks',
  project_summary: 'A full brand refresh and marketing site rebuild designed to reposition Nova Studio ahead of their Series A.',
  scope: 'Brand strategy, visual identity, a 5-page marketing site, and a lightweight design system for future campaigns.',
  proposal_items: [
    { id: 'demo-1', title: 'Brand strategy & identity', description: 'Positioning, logo, type, color', amount: 2400 },
    { id: 'demo-2', title: 'Website design & build', description: '5 pages, CMS-ready', amount: 4200 },
  ],
  amount: 6600,
};
