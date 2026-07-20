import { Download, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import FeatureGate from '../components/FeatureGate.jsx';
import { deleteProposal, getProfile, listProposals } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { exportProposalPdf } from '../utils/pdf.js';

export default function ProposalsPage() {
  const [proposals, setProposals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [proposalRows, profileRow] = await Promise.all([listProposals(), getProfile()]);
      setProposals(proposalRows);
      setProfile(profileRow);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(proposal) {
    if (!window.confirm(`Delete proposal "${proposal.title}"?`)) return;
    try {
      await deleteProposal(proposal.id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <Card variant="default">Loading proposals...</Card>;

  return (
    <FeatureGate feature="proposals" title="Proposals are a Pro feature" message="Upgrade to Pro to create proposal templates and export proposal PDFs.">
      <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Proposals</p>
          <h2 className="heading-xl">Reusable project proposals for new work.</h2>
        </div>
        <Button as={Link} variant="primary" to="/app/proposals/new" leftIcon={<Plus size={16} />}>
          New proposal
        </Button>
      </div>

      {error ? <Card variant="default"><div className="error-panel" role="alert">{error}</div></Card> : null}
      <Card variant="default">
        {proposals.length === 0 ? (
          <EmptyState
            title="No proposals yet"
            message="Create a proposal from a template and export it as a polished PDF."
            actionLabel="Create proposal"
            actionTo="/app/proposals/new"
          />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Template</th>
                  <th>Date</th>
                  <th className="table__cell--right">Amount</th>
                  <th className="table__cell--right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <td>{proposal.title}</td>
                    <td>{proposal.client_name}</td>
                    <td>{proposal.template}</td>
                    <td>{formatDate(proposal.created_at?.slice(0, 10))}</td>
                    <td className="table__cell--right">{formatMoney(proposal.amount, proposal.currency)}</td>
                    <td className="table__cell--right">
                      <div className="table__actions">
                        <Button variant="ghost" size="sm" onClick={() => exportProposalPdf(proposal, profile).catch((err) => setError(err.message))} leftIcon={<Download size={14} />}>
                          PDF
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => handleDelete(proposal)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </Card>
      </div>
    </FeatureGate>
  );
}
