import { supabase } from './supabase.js';

function requireData(result) {
  if (result.error) throw result.error;
  return result.data;
}

function requireRow(row, label = 'Record') {
  if (!row) throw new Error(`${label} not found.`);
  return row;
}

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('You must be signed in.');
  return user;
}

export async function getProfile() {
  const user = await getCurrentUser();
  const profile = requireData(await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle());
  if (profile) return profile;

  return requireData(
    await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || '',
      })
      .select()
      .single()
  );
}

export async function upsertProfile(values) {
  return requireData(
    await supabase
      .from('profiles')
      .upsert(values, { onConflict: 'id' })
      .select()
      .single()
  );
}

export async function getSubscription() {
  const subscription = requireData(
    await supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
  );

  return (
    subscription || {
      plan: 'free',
      status: 'active',
      billing_cycle: 'free',
      cancel_at_period_end: false,
    }
  );
}

export async function getUsageSummary() {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);

  const [clients, invoices] = await Promise.all([
    supabase.from('clients').select('id', { count: 'exact', head: true }),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString()),
  ]);

  if (clients.error) throw clients.error;
  if (invoices.error) throw invoices.error;

  return {
    clients: clients.count || 0,
    invoicesThisMonth: invoices.count || 0,
  };
}

export async function listClients() {
  return requireData(await supabase.from('clients').select('*').order('created_at', { ascending: false }));
}

export async function getClient(id) {
  return requireRow(requireData(await supabase.from('clients').select('*').eq('id', id).maybeSingle()), 'Client');
}

export async function createClient(values) {
  return requireData(await supabase.from('clients').insert(values).select().single());
}

export async function updateClient(id, values) {
  return requireData(await supabase.from('clients').update(values).eq('id', id).select().single());
}

export async function deleteClient(id) {
  return requireData(await supabase.from('clients').delete().eq('id', id));
}

export async function listInvoices() {
  return requireData(
    await supabase
      .from('invoices')
      .select('*, clients(id, name, company, email)')
      .order('created_at', { ascending: false })
  );
}

export async function listRecentInvoices(limit = 5) {
  return requireData(
    await supabase
      .from('invoices')
      .select('*, clients(name, company)')
      .order('created_at', { ascending: false })
      .limit(limit)
  );
}

export async function getInvoice(id) {
  const invoice = requireRow(
    requireData(
      await supabase
        .from('invoices')
        .select('*, clients(*), invoice_items(*), payments(*)')
        .eq('id', id)
        .maybeSingle()
    ),
    'Invoice'
  );
  invoice.invoice_items = [...(invoice.invoice_items || [])].sort((a, b) => a.position - b.position);
  invoice.payments = [...(invoice.payments || [])].sort((a, b) => new Date(b.payment_date) - new Date(a.payment_date));
  return invoice;
}

export async function createInvoice(invoice, items) {
  const created = requireData(await supabase.from('invoices').insert(invoice).select().single());
  const rows = items.map((item, index) => ({ ...item, invoice_id: created.id, position: index + 1 }));
  if (rows.length > 0) requireData(await supabase.from('invoice_items').insert(rows));
  return getInvoice(created.id);
}

export async function updateInvoice(id, invoice, items) {
  requireData(await supabase.from('invoices').update(invoice).eq('id', id).select().single());
  requireData(await supabase.from('invoice_items').delete().eq('invoice_id', id));
  const rows = items.map((item, index) => ({ ...item, invoice_id: id, position: index + 1 }));
  if (rows.length > 0) requireData(await supabase.from('invoice_items').insert(rows));
  return getInvoice(id);
}

export async function duplicateInvoice(id, userId, invoiceNumber) {
  const invoice = await getInvoice(id);
  const payload = {
    user_id: userId,
    client_id: invoice.client_id,
    invoice_number: invoiceNumber,
    invoice_date: new Date().toISOString().slice(0, 10),
    due_date: invoice.due_date,
    currency: invoice.currency,
    subtotal: invoice.subtotal,
    tax_total: invoice.tax_total,
    discount_total: invoice.discount_total || 0,
    total: invoice.total,
    status: 'draft',
    notes: invoice.notes,
  };
  const items = invoice.invoice_items.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    price: item.price,
    tax_rate: item.tax_rate,
  }));
  return createInvoice(payload, items);
}

export async function updateInvoiceStatus(id, status) {
  const patch = { status };
  if (status === 'paid') patch.paid_at = new Date().toISOString();
  if (status === 'sent') patch.sent_at = new Date().toISOString();
  return requireData(await supabase.from('invoices').update(patch).eq('id', id).select().single());
}

export async function deleteInvoice(id) {
  return requireData(await supabase.from('invoices').delete().eq('id', id));
}

export async function createPayment(values) {
  const payment = requireData(await supabase.from('payments').insert(values).select().single());
  const invoice = await getInvoice(values.invoice_id);
  const paid = invoice.payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (paid >= Number(invoice.total || 0)) {
    await updateInvoiceStatus(values.invoice_id, 'paid');
  }
  return payment;
}

export async function deletePayment(id, invoiceId) {
  await requireData(await supabase.from('payments').delete().eq('id', id));
  const invoice = await getInvoice(invoiceId);
  const paid = invoice.payments.reduce((sum, row) => sum + Number(row.amount || 0), 0);
  if (paid < Number(invoice.total || 0) && invoice.status === 'paid') {
    await updateInvoiceStatus(invoiceId, 'sent');
  }
}

export async function listProposals() {
  const rows = requireData(
    await supabase
      .from('proposals')
      .select('*, proposal_items(*)')
      .order('created_at', { ascending: false })
  );
  return rows.map((row) => ({
    ...row,
    proposal_items: [...(row.proposal_items || [])].sort((a, b) => a.position - b.position),
  }));
}

export async function createProposal(values, items = []) {
  const proposal = requireData(await supabase.from('proposals').insert(values).select().single());
  if (items.length > 0) {
    requireData(
      await supabase.from('proposal_items').insert(
        items.map((item, index) => ({
          ...item,
          proposal_id: proposal.id,
          position: index + 1,
        }))
      )
    );
  }
  return proposal;
}

export async function deleteProposal(id) {
  return requireData(await supabase.from('proposals').delete().eq('id', id));
}
