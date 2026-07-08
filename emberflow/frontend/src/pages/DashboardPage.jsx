import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState.jsx';
import StatCard from '../components/StatCard.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { listClients, listInvoices, listRecentInvoices } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';

export default function DashboardPage() {
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [clientRows, invoiceRows, recentRows] = await Promise.all([
          listClients(),
          listInvoices(),
          listRecentInvoices(),
        ]);
        setClients(clientRows);
        setInvoices(invoiceRows);
        setRecent(recentRows);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const stats = useMemo(() => {
    const paidInvoices = invoices.filter((invoice) => invoice.status === 'paid');
    const pendingInvoices = invoices.filter((invoice) => ['sent', 'overdue'].includes(effectiveStatus(invoice)));
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    return {
      totalRevenue,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      clientCount: clients.length,
      currency: paidInvoices[0]?.currency || invoices[0]?.currency || 'USD',
    };
  }, [clients, invoices]);

  if (loading) return <div className="panel">Loading dashboard...</div>;
  if (error) return <div className="panel error-panel">{error}</div>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your freelance finances at a glance.</h2>
        </div>
        <Link className="button primary" to="/app/invoices/new">
          New invoice
        </Link>
      </div>

      <section className="stats-grid">
        <StatCard label="Total revenue" value={formatMoney(stats.totalRevenue, stats.currency)} note="Paid invoices" />
        <StatCard label="Pending invoices" value={stats.pendingCount} note="Sent or overdue" />
        <StatCard label="Paid invoices" value={stats.paidCount} note="Completed payments" />
        <StatCard label="Clients" value={stats.clientCount} note="Active records" />
      </section>

      <section className="panel">
        <div className="panel-header">
          <h3>Recent invoices</h3>
          <Link to="/app/invoices">View all</Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState
            title="No invoices yet"
            message="Create your first invoice to start tracking revenue."
            actionLabel="Create invoice"
            actionTo="/app/invoices/new"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Client</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link to={`/app/invoices/${invoice.id}`}>{invoice.invoice_number}</Link>
                    </td>
                    <td>{invoice.clients?.company || invoice.clients?.name || '-'}</td>
                    <td>{formatDate(invoice.due_date)}</td>
                    <td>
                      <StatusBadge invoice={invoice} />
                    </td>
                    <td className="right">{formatMoney(invoice.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
