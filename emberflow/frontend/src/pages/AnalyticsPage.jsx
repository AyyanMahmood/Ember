import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import FeatureGate from '../components/FeatureGate.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { listInvoices } from '../services/api.js';
import { formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';

export default function AnalyticsPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setInvoices(await listInvoices());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const paidAll = invoices.filter((invoice) => invoice.status === 'paid');

    // Revenue totals must never add amounts across currencies into one
    // number -- that's not a smaller total, it's an arithmetically wrong
    // one. Find the currency actually used by most paid invoices and only
    // total those; invoices in any other currency are excluded from the
    // sums (not dropped from the app -- still visible on the Invoices page)
    // and surfaced via otherCurrencyCount instead of silently vanishing.
    const currencyCounts = new Map();
    paidAll.forEach((invoice) => {
      const c = invoice.currency || 'USD';
      currencyCounts.set(c, (currencyCounts.get(c) || 0) + 1);
    });
    let currency = 'USD';
    let bestCount = -1;
    for (const [c, count] of currencyCounts) {
      if (count > bestCount) {
        currency = c;
        bestCount = count;
      }
    }

    const paid = paidAll.filter((invoice) => (invoice.currency || 'USD') === currency);
    const otherCurrencyCount = paidAll.length - paid.length;
    const monthlyPaid = paid.filter((invoice) => (invoice.paid_at || invoice.invoice_date || '').slice(0, 7) === monthKey);
    const pending = invoices.filter((invoice) => ['sent', 'overdue'].includes(effectiveStatus(invoice)));
    const overdue = invoices.filter((invoice) => effectiveStatus(invoice) === 'overdue');
    const totalRevenue = paid.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const monthlyRevenue = monthlyPaid.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0);
    const bestClientsMap = new Map();

    paid.forEach((invoice) => {
      const clientId = invoice.clients?.id || invoice.client_id;
      const clientName = invoice.clients?.company || invoice.clients?.name || 'Unknown client';
      const key = clientId || clientName;
      const existing = bestClientsMap.get(key) || { id: clientId, name: clientName, revenue: 0 };
      existing.revenue += Number(invoice.total || 0);
      bestClientsMap.set(key, existing);
    });

    const bestClients = [...bestClientsMap.values()]
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      currency,
      totalRevenue,
      monthlyRevenue,
      paidCount: paid.length,
      otherCurrencyCount,
      pendingCount: pending.length,
      overdueCount: overdue.length,
      bestClients,
    };
  }, [invoices]);

  const statCards = useMemo(() => [
    {
      label: 'Total revenue',
      value: formatMoney(analytics.totalRevenue, analytics.currency),
      note: analytics.otherCurrencyCount > 0
        ? `Paid invoices in ${analytics.currency} (${analytics.otherCurrencyCount} in other currencies excluded)`
        : 'All paid invoices',
      icon: <ArrowUpRight size={18} />,
      to: '/app/invoices?status=paid',
    },
    {
      label: 'Monthly revenue',
      value: formatMoney(analytics.monthlyRevenue, analytics.currency),
      note: 'Paid this month',
      icon: <ArrowUpRight size={18} />,
      to: '/app/invoices?status=paid',
    },
    {
      label: 'Pending invoices',
      value: analytics.pendingCount,
      note: 'Sent or overdue',
      trend: analytics.pendingCount > 0 ? 'negative' : 'neutral',
      trendLabel: analytics.pendingCount > 0 ? 'Needs follow-up' : 'All caught up',
      icon: <ArrowDownRight size={18} />,
      to: '/app/invoices?status=pending',
    },
    {
      label: 'Overdue invoices',
      value: analytics.overdueCount,
      note: 'Needs follow-up',
      trend: analytics.overdueCount > 0 ? 'negative' : 'positive',
      trendLabel: analytics.overdueCount > 0 ? 'Action required' : 'All current',
      icon: analytics.overdueCount > 0 ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />,
      to: '/app/invoices?status=overdue',
    },
  ], [analytics]);

  return (
    <FeatureGate feature="analytics" title="Analytics are a Pro feature" message="Upgrade to Pro to analyze revenue, overdue work, and top clients.">
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Analytics</p>
            <h1 className="heading-xl">Revenue and client performance.</h1>
          </div>
        </div>

        {error ? (
          <Card variant="default">
            <div className="error-panel" role="alert">{error}</div>
            <div className="form-actions">
              <Button variant="secondary" onClick={load}>Try again</Button>
            </div>
          </Card>
        ) : (
          <>
            <section className="stats-grid" aria-label="Key metrics" aria-busy={loading || undefined}>
              {loading
                ? [...Array(4)].map((_, index) => (
                    <article className="stat-card stat-card--loading" key={index} aria-hidden="true">
                      <LoadingSpinner size="sm" />
                    </article>
                  ))
                : statCards.map((stat, index) => (
                    <Link key={index} to={stat.to} className="stat-card-link">
                      <StatCard
                        label={stat.label}
                        value={stat.value}
                        note={stat.note}
                        trend={stat.trend}
                        trendLabel={stat.trendLabel}
                      >
                        {stat.icon && <span className="stat-card__icon" aria-hidden="true">{stat.icon}</span>}
                      </StatCard>
                    </Link>
                  ))}
            </section>

            <Card variant="default">
              <div className="panel__header">
                <h3 className="panel__title">Best clients</h3>
                <span className="muted small">By paid revenue</span>
              </div>
              {loading ? (
                <div className="page-stack" role="status" aria-live="polite">
                  <LoadingSpinner size="md" label="Loading..." />
                </div>
              ) : analytics.bestClients.length === 0 ? (
                <EmptyState
                  title="No paid invoices yet"
                  message="Once invoices are marked paid, your top clients by revenue will show up here."
                />
              ) : (
                  <div className="ranking-list">
                    {analytics.bestClients.map((client, index) => {
                      const content = (
                        <>
                          <span className="ranking-row__rank">{index + 1}</span>
                          <span className="ranking-row__name">{client.name}</span>
                          <span className="ranking-row__value">{formatMoney(client.revenue, analytics.currency)}</span>
                        </>
                      );
                      return client.id ? (
                        <Link to={`/app/clients/${client.id}`} className="ranking-row" key={client.id}>
                          {content}
                        </Link>
                      ) : (
                        <div className="ranking-row" key={client.name}>{content}</div>
                      );
                    })}
                  </div>
              )}
            </Card>
          </>
        )}
      </div>
    </FeatureGate>
  );
}