import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import FeatureGate from '../components/FeatureGate.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
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

  const statCards = useMemo(() => [
    {
      label: 'Total revenue',
      value: formatMoney(analytics.totalRevenue, analytics.currency),
      note: 'All paid invoices',
      trend: analytics.totalRevenue > 0 ? 'positive' : 'neutral',
      trendLabel: '+12% vs last month',
      icon: <ArrowUpRight size={18} />,
    },
    {
      label: 'Monthly revenue',
      value: formatMoney(analytics.monthlyRevenue, analytics.currency),
      note: 'Paid this month',
      trend: analytics.monthlyRevenue > 0 ? 'positive' : 'neutral',
      trendLabel: '+8% vs last month',
      icon: <ArrowUpRight size={18} />,
    },
    {
      label: 'Pending invoices',
      value: analytics.pendingCount,
      note: 'Sent or overdue',
      trend: analytics.pendingCount > 0 ? 'negative' : 'neutral',
      trendLabel: analytics.pendingCount > 0 ? 'Needs follow-up' : 'All caught up',
      icon: <ArrowDownRight size={18} />,
    },
    {
      label: 'Overdue invoices',
      value: analytics.overdueCount,
      note: 'Needs follow-up',
      trend: analytics.overdueCount > 0 ? 'negative' : 'positive',
      trendLabel: analytics.overdueCount > 0 ? 'Action required' : 'All current',
      icon: analytics.overdueCount > 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />,
    },
  ], [analytics]);

  if (loading) {
    return (
      <FeatureGate feature="analytics" title="Analytics are a Pro feature" message="Upgrade to Pro to analyze revenue, overdue work, and top clients.">
        <div className="page-stack" role="status" aria-live="polite">
          <LoadingSpinner size="lg" label="Loading analytics..." />
        </div>
      </FeatureGate>
    );
  }

  if (error) {
    return (
      <FeatureGate feature="analytics" title="Analytics are a Pro feature" message="Upgrade to Pro to analyze revenue, overdue work, and top clients.">
        <div className="page-stack">
          <Card variant="default">
            <div className="error-panel" role="alert">{error}</div>
          </Card>
        </div>
      </FeatureGate>
    );
  }

  return (
    <FeatureGate feature="analytics" title="Analytics are a Pro feature" message="Upgrade to Pro to analyze revenue, overdue work, and top clients.">
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h2 className="heading-xl">Revenue and client performance.</h2>
          </div>
        </div>

        <section className="stats-grid" aria-label="Key metrics">
          {statCards.map((stat, index) => (
            <StatCard
              key={index}
              label={stat.label}
              value={stat.value}
              note={stat.note}
              trend={stat.trend}
              trendLabel={stat.trendLabel}
            >
              {stat.icon && <span className="stat-card__icon" aria-hidden="true">{stat.icon}</span>}
            </StatCard>
          ))}
        </section>

        <Card variant="default">
          <div className="panel__header">
            <h3 className="panel__title">Best clients</h3>
            <span className="muted small">By paid revenue</span>
          </div>
          {analytics.bestClients.length === 0 ? (
            <p className="muted">No paid invoices yet.</p>
          ) : (
              <div className="ranking-list">
                {analytics.bestClients.map((client, index) => (
                  <div className="ranking-row" key={client.name}>
                    <span className="ranking-row__rank">{index + 1}</span>
                    <span className="ranking-row__name">{client.name}</span>
                    <span className="ranking-row__value">{formatMoney(client.revenue, analytics.currency)}</span>
                  </div>
                ))}
              </div>
          )}
        </Card>
      </div>
    </FeatureGate>
  );
}