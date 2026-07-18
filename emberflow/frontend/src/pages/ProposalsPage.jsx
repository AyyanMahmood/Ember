import { Download, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button.jsx';
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

  if (loading) return <div className="panel">Loading proposals...</div>;

  return (
    <FeatureGate feature="proposals" title="Proposals are a Pro feature" message="Upgrade to Pro to create proposal templates and export proposal PDFs.">
      <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Proposals</p>
          <h2>Reusable project proposals for new work.</h2>
        </div>
        <Button as={Link} variant="primary" to="/app/proposals/new" leftIcon={<Plus size={16} />}>
          New proposal
        </Button>
      </div>

      {error ? <div className="panel error-panel">{error}</div> : null}
      <section className="panel">
        {proposals.length === 0 ? (
          <EmptyState
            title="No proposals yet"
            message="Create a proposal from a template and export it as a polished PDF."
            actionLabel="Create proposal"
            actionTo="/app/proposals/new"
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Client</th>
                  <th>Template</th>
                  <th>Date</th>
                  <th className="right">Amount</th>
                  <th className="right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {proposals.map((proposal) => (
                  <tr key={proposal.id}>
                    <td>{proposal.title}</td>
                    <td>{proposal.client_name}</td>
                    <td>{proposal.template}</td>
                    <td>{formatDate(proposal.created_at?.slice(0, 10))}</td>
                    <td className="right">{formatMoney(proposal.amount, proposal.currency)}</td>
                    <td className="right actions">
                      <button className="button small ghost" onClick={() => exportProposalPdf(proposal, profile).catch((err) => setError(err.message))}>
                        <Download size={15} />
                        PDF
                      </button>
                      <button className="button small danger" onClick={() => handleDelete(proposal)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </section>
      </div>
    </FeatureGate>
  );
}
