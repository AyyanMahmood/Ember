import { Copy, Download, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, IconButton } from '../components/ui/Button.jsx';
import { Card } from '../components/ui/Card.jsx';
import { Table } from '../components/ui/Table.jsx';
import { EmptyState } from '../components/ui/EmptyState.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import FeatureGate from '../components/FeatureGate.jsx';
import { deleteProposal, getProfile, listProposals } from '../services/api.js';
import { formatDate, formatMoney } from '../utils/format.js';
import { exportProposalPdf } from '../utils/pdf.js';

export default function ProposalsPage() {
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteProposal(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  }

  function duplicateProposal(proposal) {
    navigate('/app/proposals/new', { state: { duplicateFrom: proposal } });
  }

  if (loading) {
    return (
      <FeatureGate feature="proposals" title="Proposals are a Pro feature" message="Upgrade to Pro to create proposal templates and export proposal PDFs.">
        <div className="page-stack" role="status" aria-live="polite">
          <LoadingSpinner size="lg" label="Loading proposals..." />
        </div>
      </FeatureGate>
    );
  }

  const columns = [
    { key: 'title', label: 'Title' },
    { key: 'client_name', label: 'Client' },
    { key: 'template', label: 'Template' },
    { key: 'created_at', label: 'Date', render: (row) => formatDate(row.created_at?.slice(0, 10)) },
    { key: 'amount', label: 'Amount', align: 'right', render: (row) => formatMoney(row.amount, row.currency) },
    {
      key: 'actions', label: 'Actions', align: 'right', render: (row) => (
        <div className="table__actions">
          <IconButton size="sm" onClick={() => duplicateProposal(row)} aria-label="Duplicate" title="Duplicate">
            <Copy size={14} />
          </IconButton>
          <IconButton
            size="sm"
            onClick={() => exportProposalPdf(row, profile).catch((err) => setError(err.message))}
            aria-label="Download PDF"
            title="Download PDF"
          >
            <Download size={14} />
          </IconButton>
          <IconButton
            size="sm"
            className="icon-button--danger"
            onClick={() => setDeleteTarget(row)}
            aria-label="Delete"
            title="Delete"
          >
            <Trash2 size={14} />
          </IconButton>
        </div>
      ),
    },
  ];

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
          <Table columns={columns} data={proposals} keyExtractor={(row) => row.id} />
        )}
        </Card>
      </div>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete proposal"
        message={deleteTarget ? `Delete proposal "${deleteTarget.title}"? This can't be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
      />
    </FeatureGate>
  );
}
