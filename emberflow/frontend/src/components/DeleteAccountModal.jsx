import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Trash2 } from 'lucide-react';
import { Modal, ModalFooter } from './ui/Modal.jsx';
import { Button } from './ui/Button.jsx';
import { Input } from './ui/Input.jsx';
import { Alert } from './ui/Alert.jsx';
import { EmberSpinner } from './ui/Loading.jsx';
import { useAuth } from '../hooks/useAuth.js';
import { deleteAccount } from '../services/account.js';

const DELETION_ITEMS = [
  'Your profile, business, and branding settings',
  'All clients and their contact details',
  'All invoices, invoice items, and payment records',
  'All proposals and proposal items',
  'Uploaded logos and other files',
  'Your subscription — canceled immediately, if active',
];

// Three phases in one persistent Modal (never unmounted/remounted between
// them) so focus trap + scroll lock stay continuous instead of visibly
// resetting: confirm -> deleting -> success. Deliberately not a <form> —
// Delete Forever is the only way to submit, so an accidental Enter
// keypress can never trigger an irreversible action.
export function DeleteAccountModal({ isOpen, onClose, isPro }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState('');
  const [phase, setPhase] = useState('confirm');
  const [error, setError] = useState('');

  const isMatch = useMemo(() => {
    const value = confirmation.trim();
    if (!value) return false;
    return value === 'DELETE' || value.toLowerCase() === (user?.email || '').toLowerCase();
  }, [confirmation, user?.email]);

  const locked = phase !== 'confirm';

  function handleClose() {
    if (locked) return; // belt-and-suspenders — every close trigger below is already disabled while locked
    setConfirmation('');
    setError('');
    onClose();
  }

  async function handleDelete() {
    if (!isMatch) return;
    setError('');
    setPhase('deleting');
    try {
      await deleteAccount(confirmation.trim());
      setPhase('success');
      // Hold the success message on screen for a beat before tearing the
      // session down — signing out immediately would flip useAuth's `user`
      // to null while this modal (and the Settings page under it) is still
      // mounted, racing ProtectedRoute's own redirect-to-/login against the
      // explicit redirect-to-landing-page below.
      setTimeout(async () => {
        await signOut();
        navigate('/', { replace: true });
      }, 1800);
    } catch (err) {
      setError(err.message);
      setPhase('confirm'); // confirmation text is intentionally kept so a retry doesn't require retyping
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={phase === 'confirm' ? 'Delete your account' : undefined}
      size="sm"
      icon={phase === 'confirm' ? 'danger' : null}
      showCloseButton={!locked}
      closeOnEscape={!locked}
      closeOnOverlayClick={!locked}
    >
      {phase === 'confirm' && (
        <div className="delete-account">
          <p className="confirm-dialog__message">
            This permanently deletes your account and everything in it. This cannot be undone.
          </p>
          <ul className="delete-account__list">
            {DELETION_ITEMS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {isPro && (
            <Alert variant="warning" title="Your Pro subscription will be canceled immediately">
              You'll lose Pro access the moment your account is deleted — there's no need to cancel it separately first.
            </Alert>
          )}
          {error && (
            <Alert variant="danger" title="Couldn't delete your account">
              {error}
            </Alert>
          )}
          <Input
            label={`Type DELETE or "${user?.email || 'your email'}" to confirm`}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="off"
            autoFocus
          />
          <ModalFooter>
            <Button variant="secondary" onClick={handleClose}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete} disabled={!isMatch} leftIcon={<Trash2 size={16} />}>
              Delete Forever
            </Button>
          </ModalFooter>
        </div>
      )}

      {phase === 'deleting' && (
        <div className="delete-account__status" role="status" aria-live="assertive">
          <EmberSpinner size="xl" />
          <p className="delete-account__status-text">Deleting your account…</p>
          <p className="muted small">This may take a moment — please don't close this window.</p>
        </div>
      )}

      {phase === 'success' && (
        <div className="delete-account__status" role="status" aria-live="assertive">
          <span className="delete-account__success-icon" aria-hidden="true">
            <CheckCircle2 size={32} />
          </span>
          <p className="delete-account__status-text">Your account has been deleted.</p>
          <p className="muted small">Redirecting you now…</p>
        </div>
      )}
    </Modal>
  );
}
