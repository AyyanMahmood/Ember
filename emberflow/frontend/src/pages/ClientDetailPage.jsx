import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { deleteClient, getClient, listInvoices } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const [clientRow, invoiceRows] = await Promise.all([getClient(id), listInvoices()]);
        setClient(clientRow);
        setInvoices(invoiceRows.filter((invoice) => invoice.client_id === id));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  async function handleDelete() {
    if (!window.confirm(`Delete ${client.name}? Invoices linked to this client must be removed first.`)) return;
    try {
      await deleteClient(id);
      navigate('/app/clients');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Card variant="default">Loading client...</Card>;
  if (error) return <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card>;

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Client</p>
          <h2>{client.name}</h2>
        </div>
        <div className="actions">
          <Button as={Link} variant="ghost" to={`/app/clients/${id}/edit`}>Edit</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <section className="detail-grid">
        <Card variant="default">
          <h3>Contact</h3>
          <dl className="details-list">
            <dt>Email</dt>
            <dd>{client.email}</dd>
            <dt>Company</dt>
            <dd>{client.company || '-'}</dd>
            <dt>Phone</dt>
            <dd>{client.phone || '-'}</dd>
            <dt>Country</dt>
            <dd>{client.country || '-'}</dd>
          </dl>
        </Card>
        <Card variant="default">
          <h3>Notes</h3>
          <p className="preserve">{client.notes || 'No notes recorded.'}</p>
        </Card>
      </section>

      <Card variant="default">
        <div className="panel-header">
          <h3>Invoices</h3>
          <Link to={`/app/invoices/new?client=${id}`}>Create invoice</Link>
        </div>
        {invoices.length === 0 ? (
          <p className="muted">No invoices for this client yet.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th className="right">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <Link to={`/app/invoices/${invoice.id}`}>{invoice.invoice_number}</Link>
                    </td>
                    <td>{formatDate(invoice.invoice_date)}</td>
                    <td><StatusBadge status={invoice.status} size="sm" /></td>
                    <td className="right">{formatMoney(invoice.total, invoice.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
