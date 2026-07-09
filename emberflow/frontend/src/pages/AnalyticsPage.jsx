import { useEffect, useMemo, useState } from 'react';
import FeatureGate from '../components/FeatureGate.jsx';
import StatCard from '../components/StatCard.jsx';
import { listInvoices } from '../services/api.js';
import { formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';

export default function AnalyticsPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setInvoices(await listInvoices());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const analytics = useMemo(() => {
    const currency = invoices[0]?.currency || 'USD';
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const paid = invoices.filter((invoice) => invoice.status === 'paid');
    const monthlyPaid = paid.filter((invoice) => (invoice.paid_at || invoice.invoice_date || '').slice(0, 7) === monthKey);
    const pending = invoices.filter((invoice) => ['sent', 'overdue'].includes(effectiveStatus(invoice)));
    const overdue = invoices.filter((invoice) => effectiveStatus(invoice) === 'overdue');
    const totalRevenue = paid.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const monthlyRevenue = monthlyPaid.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const bestClientsMap = new Map();

    paid.forEach((invoice) => {
      const clientName = invoice.clients?.company || invoice.clients?.name || 'Unknown client';
      bestClientsMap.set(clientName, (bestClientsMap.get(clientName) || 0) + Number(invoice.total || 0));
    });

    const bestClients = [...bestClientsMap.entries()]
      .map(([name, revenue]) => ({ name, revenue }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      currency,
      totalRevenue,
      monthlyRevenue,
      paidCount: paid.length,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      bestClients,
    };
  }, [invoices]);

  if (loading) return <div className="panel">Loading analytics...</div>;
  if (error) return <div className="panel error-panel">{error}</div>;

  return (
    <FeatureGate feature="analytics" title="Analytics are a Pro feature" message="Upgrade to Pro to analyze revenue, overdue work, and top clients.">
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h2>Revenue and client performance.</h2>
          </div>
        </div>

        <section className="stats-grid">
          <StatCard label="Total revenue" value={formatMoney(analytics.totalRevenue, analytics.currency)} note="All paid invoices" />
          <StatCard label="Monthly revenue" value={formatMoney(analytics.monthlyRevenue, analytics.currency)} note="Paid this month" />
          <StatCard label="Pending invoices" value={analytics.pendingCount} note="Sent or overdue" />
          <StatCard label="Overdue invoices" value={analytics.overdueCount} note="Needs follow-up" />
        </section>

        <section className="panel">
          <div className="panel-header">
            <h3>Best clients</h3>
            <span className="muted small">By paid revenue</span>
          </div>
          {analytics.bestClients.length === 0 ? (
            <p className="muted">No paid invoices yet.</p>
          ) : (
            <div className="ranking-list">
              {analytics.bestClients.map((client, index) => (
                <div className="ranking-row" key={client.name}>
                  <span>{index + 1}</span>
                  <strong>{client.name}</strong>
                  <em>{formatMoney(client.revenue, analytics.currency)}</em>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </FeatureGate>
  );
}
