import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, DollarSign, CheckCircle2, Users } from 'lucide-react';
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
  const navigate = useNavigate();
  const [clients, setClients] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
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

  useEffect(() => {
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
      icon: <DollarSign size={18} />,
      to: '/app/invoices?status=paid',
    },
    {
      label: 'Pending invoices',
      value: stats.pendingCount,
      note: 'Sent or overdue',
      trend: stats.pendingCount > 0 ? 'negative' : 'neutral',
      trendLabel: stats.pendingCount > 0 ? 'Needs follow-up' : 'All caught up',
      icon: <ArrowDownRight size={18} />,
      to: '/app/invoices?status=pending',
    },
    {
      label: 'Paid invoices',
      value: stats.paidCount,
      note: 'Completed payments',
      icon: <CheckCircle2 size={18} />,
      to: '/app/invoices?status=paid',
    },
    {
      label: 'Clients',
      value: stats.clientCount,
      note: 'Active records',
      icon: <Users size={18} />,
      to: '/app/clients',
    },
  ], [stats]);

  if (error) {
    return (
      <div className="page-stack">
        <Card variant="default">
          <div className="error-panel" role="alert">{error}</div>
          <div className="form-actions">
            <Button variant="secondary" onClick={load}>Try again</Button>
          </div>
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
    status: <StatusBadge status={effectiveStatus(invoice)} />,
    total: <span className="mono">{formatMoney(invoice.total, invoice.currency)}</span>,
  }));

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Dashboard</p>
          <h1 className="heading-xl">Your freelance finances at a glance.</h1>
        </div>
        <Button as={Link} variant="primary" to="/app/invoices/new">
          New invoice
        </Button>
      </div>

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
          <h3 className="panel__title">Recent invoices</h3>
          <Button as={Link} to="/app/invoices" variant="ghost" size="sm" rightIcon={<ArrowUpRight size={14} />}>
            View all
          </Button>
        </div>
        <Table
          columns={columns}
          data={tableData}
          loading={loading}
          keyExtractor={(row) => row.id}
          onRowClick={(row) => navigate(`/app/invoices/${row.id}`)}
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