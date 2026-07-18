import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import { Card, StatCard } from '../components/ui/Card.jsx';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Table } from '../components/ui/Table.jsx';
import { EmptyState, EmptyStateIllustration } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { Button } from '../components/ui/Button.jsx';
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

  const statCards = useMemo(() => [
    {
      label: 'Total revenue',
      value: formatMoney(stats.totalRevenue, stats.currency),
      note: 'Paid invoices',
      trend: stats.totalRevenue > 0 ? 'positive' : 'neutral',
      trendLabel: '+12% vs last month',
      icon: <ArrowUpRight size={18} />,
    },
    {
      label: 'Pending invoices',
      value: stats.pendingCount,
      note: 'Sent or overdue',
      trend: stats.pendingCount > 0 ? 'negative' : 'neutral',
      trendLabel: stats.pendingCount > 0 ? 'Needs follow-up' : 'All caught up',
      icon: <ArrowDownRight size={18} />,
    },
    {
      label: 'Paid invoices',
      value: stats.paidCount,
      note: 'Completed payments',
      trend: 'positive',
      trendLabel: '+5% vs last month',
      icon: <ArrowUpRight size={18} />,
    },
    {
      label: 'Clients',
      value: stats.clientCount,
      note: 'Active records',
      trend: 'neutral',
      trendLabel: 'No change',
      icon: <Minus size={18} />,
    },
  ], [stats]);

  if (loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-stack">
        <Card variant="default">
          <div className="error-panel" role="alert">{error}</div>
        </Card>
      </div>
    );
  }

  const columns = [
    { key: 'invoice_number', label: 'Invoice' },
    { key: 'client', label: 'Client' },
    { key: 'due_date', label: 'Due' },
    { key: 'status', label: 'Status' },
    { key: 'total', label: 'Total', align: 'right' },
  ];

  const tableData = recent.map((invoice) => ({
    ...invoice,
    invoice_number: (
      <Link to={`/app/invoices/${invoice.id}`} className="table__link">
        {invoice.invoice_number}
      </Link>
    ),
    client: invoice.clients?.company || invoice.clients?.name || '—',
    due_date: formatDate(invoice.due_date),
    status: <StatusBadge invoice={invoice} />,
    total: <span className="mono">{formatMoney(invoice.total, invoice.currency)}</span>,
  }));

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h2>Your freelance finances at a glance.</h2>
        </div>
        <Button as={Link} variant="primary" to="/app/invoices/new">
          New invoice
        </Button>
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
          />
        ))}
      </section>

      <Card variant="default">
        <div className="panel-header">
          <h3 className="panel__title">Recent invoices</h3>
          <Link to="/app/invoices" className="panel__action">View all</Link>
        </div>
        <Table
          columns={columns}
          data={tableData}
          keyExtractor={(row) => row.id}
          emptyTitle="No invoices yet"
          emptyMessage="Create your first invoice to start tracking revenue."
          emptyAction={{
            label: 'Create invoice',
            to: '/app/invoices/new',
          }}
          emptyIcon={<EmptyStateIllustration variant="document" />}
        />
      </Card>
    </div>
  );
}