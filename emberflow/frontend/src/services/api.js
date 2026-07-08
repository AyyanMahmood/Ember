import { supabase } from './supabase.js';

function requireData(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function getProfile() {
  return requireData(await supabase.from('profiles').select('*').single());
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

export async function listClients() {
  return requireData(await supabase.from('clients').select('*').order('created_at', { ascending: false }));
}

export async function getClient(id) {
  return requireData(await supabase.from('clients').select('*').eq('id', id).single());
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
      .select('*, clients(name, company, email)')
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
  const invoice = requireData(
    await supabase
      .from('invoices')
      .select('*, clients(*), invoice_items(*)')
      .eq('id', id)
      .single()
  );
  invoice.invoice_items = [...(invoice.invoice_items || [])].sort((a, b) => a.position - b.position);
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

export async function updateInvoiceStatus(id, status) {
  return requireData(await supabase.from('invoices').update({ status }).eq('id', id).select().single());
}

export async function deleteInvoice(id) {
  return requireData(await supabase.from('invoices').delete().eq('id', id));
}

export async function listProposals() {
  return requireData(await supabase.from('proposals').select('*').order('created_at', { ascending: false }));
}

export async function createProposal(values) {
  return requireData(await supabase.from('proposals').insert(values).select().single());
}

export async function deleteProposal(id) {
  return requireData(await supabase.from('proposals').delete().eq('id', id));
}
