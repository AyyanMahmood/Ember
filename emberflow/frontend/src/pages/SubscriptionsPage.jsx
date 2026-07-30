import { Crown, ExternalLink, LifeBuoy, Receipt, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { ItemRow } from '../components/ui/ItemRow.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { ProgressBar } from '../components/ui/ProgressBar.jsx';
import { ProgressRing } from '../components/ui/ProgressRing.jsx';
import { SegmentedControl } from '../components/ui/SegmentedControl.jsx';
import { COMPANY } from '../data/company.js';
import { useAnimatedNumber } from '../hooks/useAnimatedNumber.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { openBillingPortal, startCheckout } from '../services/subscriptions.js';
import { formatDateTime } from '../utils/format.js';
import { formatLimit, PLANS, planPriceValue } from '../utils/plans.js';

function UsageMeter({ label, used, limit }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);

  return (
    <div className="usage-meter">
      <div className="usage-meter__header">
        <span className="muted small">{label}</span>
        <strong>{used} / {formatLimit(limit)}</strong>
      </div>
      {!unlimited && <ProgressBar value={pct} thresholds={{ warning: 80, danger: 95 }} />}
    </div>
  );
}

// How far through the current billing period the account is, expressed as
// "fraction remaining" (1 = just renewed, 0 = about to renew) so it reads
// as a countdown/runway rather than a depleting bar. Returns null (ring
// shows only its track) when there's no period to measure against.
function useRenewalProgress(startIso, endIso) {
  if (!startIso || !endIso) return null;
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  const elapsed = Math.min(Math.max((now - start) / (end - start), 0), 1);
  return 1 - elapsed;
}

const CADENCE_OPTIONS = [
  { plan: 'pro_monthly', ...PLANS.pro_monthly, label: 'Monthly' },
  { plan: 'pro_yearly', ...PLANS.pro_yearly, label: 'Yearly' },
];

function AnimatedPrice({ plan }) {
  const target = planPriceValue(plan);
  const animated = useAnimatedNumber(target);
  const cadence = PLANS[plan].cadence;

  return (
    <div className="plan-price">
      <span className="plan-price__amount">
        <span className="plan-price__currency">$</span>
        {Math.round(animated)}
      </span>
      <span className="plan-price__cadence">/{cadence}</span>
      <span className="sr-only" aria-live="polite">{`${PLANS[plan].price} per ${cadence}`}</span>
    </div>
  );
}

export default function SubscriptionsPage() {
  const subscription = useSubscription();
  const [selectedCadence, setSelectedCadence] = useState('pro_yearly');
  const [billingAction, setBillingAction] = useState('');
  const [billingError, setBillingError] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  // Purchase-flow race condition (Launch Hardening audit, 2026-07-30):
  // Polar's checkout redirects the browser straight back to
  // success_url=...?billing=success the moment payment succeeds, but the
  // subscription.* webhook that actually writes plan='pro_*' to the DB is a
  // separate async delivery. Polar's own docs note the subscription's
  // status "might not be active yet" on the very first event. Without this,
  // a paying customer could land here and see "Free plan" for several
  // seconds with zero explanation. `billing=success` was already being set
  // but nothing ever read it. Poll briefly (bounded, not indefinite) while
  // showing a confirming state instead of a flat "you're still Free."
  const [confirmingPurchase, setConfirmingPurchase] = useState(() => searchParams.get('billing') === 'success');
  const confirmAttemptsRef = useRef(0);

  useEffect(() => {
    if (searchParams.get('billing') !== 'success') return;
    // Strip the param immediately so a later manual refresh doesn't replay this.
    setSearchParams((prev) => {
      prev.delete('billing');
      return prev;
    }, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!confirmingPurchase) return undefined;
    if (subscription.isPro) {
      setConfirmingPurchase(false);
      confirmAttemptsRef.current = 0;
      return undefined;
    }
    if (subscription.loading) return undefined;
    if (confirmAttemptsRef.current >= 8) {
      setConfirmingPurchase(false);
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      confirmAttemptsRef.current += 1;
      subscription.refresh();
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [confirmingPurchase, subscription.isPro, subscription.loading, subscription.refresh]);

  const yearlySavings = planPriceValue('pro_monthly') * 12 - planPriceValue('pro_yearly');

  async function checkout(plan) {
    setBillingAction(plan);
    setBillingError('');
    try {
      const { url } = await startCheckout(plan);
      window.location.assign(url);
    } catch (err) {
      setBillingError(err.message);
      setBillingAction('');
    }
  }

  async function manageBilling() {
    setBillingAction('portal');
    setBillingError('');
    try {
      const { url } = await openBillingPortal();
      window.location.assign(url);
    } catch (err) {
      setBillingError(err.message);
      setBillingAction('');
    }
  }

  const renewalProgress = useRenewalProgress(
    subscription.subscription?.current_period_start,
    subscription.subscription?.current_period_end
  );

  if (subscription.loading) {
    return (
      <div className="page-stack" role="status" aria-live="polite">
        <LoadingSpinner size="lg" label="Loading subscription..." />
      </div>
    );
  }

  const row = subscription.subscription;
  const hasCustomer = Boolean(row?.polar_customer_id);
  const status = row?.status || 'active';
  const cancelling = Boolean(row?.cancel_at_period_end);
  const planName = subscription.plan?.name || PLANS.free.name;

  return (
    <div className="page-stack subscriptions-page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Subscriptions</p>
          <h1 className="heading-xl">Plan, billing, and payment history.</h1>
        </div>
      </div>

      {subscription.error ? <Card variant="default"><div className="error-panel" role="alert">{subscription.error}</div></Card> : null}
      {billingError ? <Card variant="default"><p className="form-error" role="alert">{billingError}</p></Card> : null}
      {confirmingPurchase ? (
        <Card variant="default">
          <div className="panel__actions-row" role="status" aria-live="polite">
            <span className="spinner spinner--sm" aria-hidden="true" />
            <span>Confirming your purchase with Polar — this usually takes a few seconds.</span>
          </div>
        </Card>
      ) : null}

      <Card variant="default" className="plan-hero">
        <div className="plan-hero__top">
          <ProgressRing value={renewalProgress} variant={subscription.isPro ? 'accent' : 'accent'} glow>
            {subscription.isPro ? <Crown size={20} aria-hidden="true" /> : <Sparkles size={20} aria-hidden="true" />}
          </ProgressRing>
          <div className="plan-hero__identity">
            <div className="plan-hero__name-row">
              <h2 className="plan-hero__name">{planName}</h2>
              {subscription.isPro && <StatusBadge status={cancelling ? 'pending' : status === 'active' ? 'paid' : status} />}
            </div>
            <span className="muted small">
              {row?.current_period_end
                ? `${cancelling ? 'Access ends' : 'Renews'} ${formatDateTime(row.current_period_end)}`
                : 'Free plan — upgrade any time'}
            </span>
          </div>
          {hasCustomer && (
            <Button variant="ghost" type="button" onClick={manageBilling} disabled={billingAction === 'portal'} leftIcon={<ExternalLink size={16} />} className="plan-hero__manage">
              {billingAction === 'portal' ? 'Opening...' : 'Manage billing'}
            </Button>
          )}
        </div>

        <div className="subscription-grid">
          <UsageMeter label="Invoice usage" used={subscription.usage.invoicesThisMonth} limit={subscription.invoiceLimit} />
          <UsageMeter label="Client usage" used={subscription.usage.clients} limit={subscription.clientLimit} />
        </div>

        {cancelling ? (
          <p className="muted small subscription-notice">
            Your subscription is set to cancel. You'll keep Pro access until {formatDateTime(row.current_period_end)}, then your account
            reverts to Free. Open Manage billing to resume before then.
          </p>
        ) : null}
      </Card>

      {confirmingPurchase ? null : !subscription.isPro ? (
        <Card variant="default">
          <CardHeader title="Upgrade to Pro" subtitle="Choose a billing cadence." />
          <div className="cadence-picker">
            <SegmentedControl
              data={CADENCE_OPTIONS.map((o) => ({ value: o.plan, label: o.label }))}
              value={selectedCadence}
              onChange={setSelectedCadence}
              name="billing-cadence"
              disabled={Boolean(billingAction)}
              aria-label="Choose billing cadence"
            />
            <div className="cadence-picker__price">
              <AnimatedPrice plan={selectedCadence} />
              {selectedCadence === 'pro_yearly' && yearlySavings > 0 ? (
                <Badge variant="success" size="sm" className="cadence-savings">Save ${yearlySavings}/year</Badge>
              ) : null}
            </div>
          </div>
          <div className="form-actions">
            <Button variant="primary" type="button" onClick={() => checkout(selectedCadence)} disabled={Boolean(billingAction)}>
              {billingAction === selectedCadence ? 'Opening...' : `Upgrade to ${CADENCE_OPTIONS.find((o) => o.plan === selectedCadence).label}`}
            </Button>
          </div>
        </Card>
      ) : (
        <Card variant="default">
          <CardHeader title="Switch billing cadence" subtitle={`You're on ${planName}.`} />
          <p className="muted small">
            Switching between Monthly and Yearly isn't instant today — cancel your current plan from Manage billing, you'll keep Pro
            until it ends, then subscribe to the other cadence from here once it does. No overlap, no double charge.
          </p>
        </Card>
      )}

      <Card variant="default">
        <CardHeader title="Billing history & invoices" subtitle="Payment history, receipts, and invoice downloads." />
        {hasCustomer ? (
          <ItemRow
            as="button"
            type="button"
            onClick={manageBilling}
            loading={billingAction === 'portal'}
            icon={<Receipt size={18} />}
            title="View in Polar's customer portal"
            subtitle="Past payments, receipts, and invoice downloads — handled securely by Polar."
            trailing={<ExternalLink size={16} aria-hidden="true" />}
          />
        ) : (
          <p className="muted small">Nothing to show yet — you haven't subscribed to Pro. History and invoices appear here once you do.</p>
        )}
      </Card>

      <Card variant="default">
        <CardHeader title="Refund policy" subtitle="Summary — see the full policy for details." />
        <p className="muted small">
          Subscription charges are non-refundable except for billing errors, duplicate charges, or an extended outage — see the full
          policy for details. Cancel any time and you'll keep Pro access through the end of the period you already paid for; we don't
          prorate partial periods.
        </p>
        <Link to="/refund" className="link">Read the full Refund Policy →</Link>
      </Card>

      <Card variant="default">
        <CardHeader title="FAQ" />
        <div className="subscriptions-faq">
          <details>
            <summary>Can I switch between Monthly and Yearly?</summary>
            <p className="muted small">
              Yes, but not instantly in place — cancel your current plan in Manage billing, keep Pro until it ends, then subscribe to
              the other cadence from here. You won't be double-charged: the new cadence only starts once the period you already paid
              for runs out.
            </p>
          </details>
          <details>
            <summary>What happens to my data if I downgrade to Free?</summary>
            <p className="muted small">
              Nothing is deleted. You keep read access to everything you've created; Free-tier limits (5 invoices/month, 10 clients)
              apply going forward, and Pro-only features like Analytics, Proposals, and Brand Studio's logo/font controls lock again.
            </p>
          </details>
          <details>
            <summary>Can I have both a Monthly and a Yearly subscription?</summary>
            <p className="muted small">
              No — EmberFlow only ever tracks one active subscription per account, and the upgrade flow blocks starting a second one
              while you already have an active plan.
            </p>
          </details>
          <details>
            <summary>Who charges my card?</summary>
            <p className="muted small">
              Polar, as Merchant of Record — they handle the charge, tax/VAT, and receipts. EmberFlow never sees or stores your card
              details.
            </p>
          </details>
        </div>
      </Card>

      <Card variant="default">
        <CardHeader title="Support" subtitle="Billing questions we can't answer above." />
        <div className="form-actions">
          <Button as="a" href={`mailto:${COMPANY.supportEmail}`} variant="secondary" leftIcon={<LifeBuoy size={16} />}>
            Email support
          </Button>
          <Link to="/contact" className="button button--ghost">Contact page</Link>
        </div>
      </Card>

      {subscription.isPro ? (
        <Card variant="default" className="danger-zone">
          <div className="danger-zone__header">
            <span className="danger-zone__icon-badge" aria-hidden="true"><ShieldAlert size={16} /></span>
            <div>
              <h3 className="panel__title">Danger zone</h3>
              <p className="panel__subtitle">Cancel your subscription.</p>
            </div>
          </div>
          <p className="muted small">
            Cancelling stops future renewals. You keep Pro access until {row?.current_period_end ? formatDateTime(row.current_period_end) : 'the end of your current period'},
            then your account reverts to Free automatically — nothing is deleted.
          </p>
          <div className="form-actions">
            <Button variant="danger" type="button" onClick={() => setCancelConfirmOpen(true)} leftIcon={<ShieldAlert size={16} />}>
              Cancel subscription
            </Button>
          </div>
        </Card>
      ) : null}

      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={() => {
          setCancelConfirmOpen(false);
          manageBilling();
        }}
        title="Cancel your subscription?"
        message={`You'll be taken to Polar's secure billing portal to finish cancelling. You'll keep Pro access until ${row?.current_period_end ? formatDateTime(row.current_period_end) : 'the end of your current period'} — nothing is deleted, and you can resume any time before then.`}
        confirmLabel="Continue to billing portal"
        cancelLabel="Never mind"
        variant="danger"
        loading={billingAction === 'portal'}
      />
    </div>
  );
}
