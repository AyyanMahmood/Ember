import { ArrowLeftRight, Calendar, CreditCard, Crown, ExternalLink, MailWarning, Receipt, RotateCcw, ShieldAlert, Sparkles, Wallet } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ProActivation } from '../components/ProActivation.jsx';
import { Alert } from '../components/ui/Alert.jsx';
import { Badge, EarlySupporterBadge, StatusBadge } from '../components/ui/Badge.jsx';
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
import { useAuth } from '../hooks/useAuth.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { cancelSubscription, openBillingPortal, resumeSubscription, startCheckout, switchPlan } from '../services/subscriptions.js';
import { isEarlySupporter } from '../utils/earlySupporter.js';
import { formatDateTime } from '../utils/format.js';
import { formatLimit, getAnnualSavings, getPlansInGroup, PLANS, planPriceValue } from '../utils/plans.js';

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

// The upgrade cadence choices are the paid variants of the 'pro' group, from
// the catalog — a third variant (or a different group's variants) needs no
// change here.
const CADENCE_OPTIONS = getPlansInGroup('pro').map((plan) => ({ plan: plan.id, ...plan, label: plan.shortName }));

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
  const { user } = useAuth();
  const earlySupporter = isEarlySupporter(user);
  const [selectedCadence, setSelectedCadence] = useState('pro_yearly');
  const [billingAction, setBillingAction] = useState('');
  const [billingError, setBillingError] = useState('');
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [switchConfirmOpen, setSwitchConfirmOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [cancelBusy, setCancelBusy] = useState(false);
  const switchTargetRef = useRef(null);
  const switchPollRef = useRef(0);
  const cancelTargetRef = useRef(true); // true = cancelling, false = resuming
  const cancelPollRef = useRef(0);
  const [searchParams, setSearchParams] = useSearchParams();

  // Purchase-flow race condition (Launch Hardening audit, 2026-07-30):
  // Polar's checkout redirects the browser straight back to
  // success_url=...?billing=success the moment payment succeeds, but the
  // subscription.* webhook that actually writes plan='pro_*' to the DB is a
  // separate async delivery. Polar's own docs note the subscription's
  // status "might not be active yet" on the very first event. Without this,
  // a paying customer could land here and see "Free plan" for several
  // seconds with zero explanation.
  //
  // Presentation (2026-07-31): instead of a flat "confirming…" spinner, this
  // drives the ProActivation experience — the ember-ring welcome overlay.
  // We keep polling entitlement underneath so `subscription.isPro` flips as
  // soon as the webhook lands; the overlay watches that and reveals the
  // welcome, then dismisses itself via onDone. `billing=success` was already
  // being set but nothing read it.
  const [showActivation, setShowActivation] = useState(() => searchParams.get('billing') === 'success');
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
    if (!showActivation) return undefined;
    // Entitlement synced, or we've hit the poll ceiling — stop polling. The
    // overlay owns its own dismissal (it reveals the welcome the moment
    // isPro is true, or proceeds optimistically after its safety ceiling),
    // so we deliberately don't tear it down here.
    if (subscription.isPro) return undefined;
    if (subscription.loading) return undefined;
    if (confirmAttemptsRef.current >= 8) return undefined;
    const timeoutId = setTimeout(() => {
      confirmAttemptsRef.current += 1;
      subscription.refresh();
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [showActivation, subscription.isPro, subscription.loading, subscription.refresh]);

  const yearlySavings = getAnnualSavings('pro');

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

  // In-app plan switch. Kicks off Polar's in-place product change, then polls
  // briefly so the plan hero reflects the new plan without a manual refresh
  // (the subscription.updated webhook is what actually persists the row —
  // this just waits for it to land, mirroring the purchase-confirm poll).
  async function doSwitch(targetId) {
    setSwitchConfirmOpen(false);
    setBillingError('');
    switchTargetRef.current = targetId;
    switchPollRef.current = 0;
    setSwitching(true);
    try {
      await switchPlan(targetId);
      subscription.refresh();
    } catch (err) {
      setBillingError(err.message);
      setSwitching(false);
    }
  }

  async function doCancel() {
    setCancelConfirmOpen(false);
    setBillingError('');
    cancelTargetRef.current = true;
    cancelPollRef.current = 0;
    setCancelBusy(true);
    try {
      await cancelSubscription();
      subscription.refresh();
    } catch (err) {
      setBillingError(err.message);
      setCancelBusy(false);
    }
  }

  async function doResume() {
    setBillingError('');
    cancelTargetRef.current = false;
    cancelPollRef.current = 0;
    setCancelBusy(true);
    try {
      await resumeSubscription();
      subscription.refresh();
    } catch (err) {
      setBillingError(err.message);
      setCancelBusy(false);
    }
  }

  // Poll the synced row until the switched plan / cancel state is reflected,
  // then stop. Bounded (8 tries) so a lagging webhook can't spin forever.
  useEffect(() => {
    if (!switching) return undefined;
    if (subscription.subscription?.plan === switchTargetRef.current) {
      setSwitching(false);
      return undefined;
    }
    if (switchPollRef.current >= 8) {
      setSwitching(false);
      return undefined;
    }
    const t = setTimeout(() => {
      switchPollRef.current += 1;
      subscription.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [switching, subscription.subscription?.plan, subscription.refresh]);

  useEffect(() => {
    if (!cancelBusy) return undefined;
    if (Boolean(subscription.subscription?.cancel_at_period_end) === cancelTargetRef.current) {
      setCancelBusy(false);
      return undefined;
    }
    if (cancelPollRef.current >= 8) {
      setCancelBusy(false);
      return undefined;
    }
    const t = setTimeout(() => {
      cancelPollRef.current += 1;
      subscription.refresh();
    }, 1500);
    return () => clearTimeout(t);
  }, [cancelBusy, subscription.subscription?.cancel_at_period_end, subscription.refresh]);

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

  // A load failure with no subscription row at all means we genuinely don't
  // know this account's real plan/status -- falling through to the normal
  // page below would render every "you're on Free, upgrade now" affordance
  // by default, which is actively misleading (and, worse, could read as
  // "you're on Free" to an actual paying Pro customer) rather than just
  // incomplete. Show only the error + retry until a real answer loads.
  if (subscription.error && !subscription.subscription) {
    return (
      <div className="page-stack">
        <div className="page-header">
          <div>
            <p className="eyebrow">Subscriptions</p>
            <h1 className="heading-xl">Plan, billing, and payment history.</h1>
          </div>
        </div>
        <Alert variant="danger" title="Couldn't load your subscription">
          {subscription.error}
        </Alert>
        <div className="form-actions">
          <Button variant="secondary" onClick={subscription.refresh}>Try again</Button>
        </div>
      </div>
    );
  }

  const row = subscription.subscription;
  const hasCustomer = Boolean(row?.polar_customer_id);
  const status = row?.status || 'active';
  const cancelling = Boolean(row?.cancel_at_period_end);
  // Failed-payment / dunning state. Polar moves a subscription to past_due
  // when a renewal charge fails, then auto-retries over ~3 weeks; EmberFlow
  // keeps Pro access throughout (past_due is in hasAccessGrantingStatus /
  // isSubscriptionActive on both the backend and frontend, deliberately).
  const pastDue = status === 'past_due';
  // Involuntary revoke: Polar exhausted its payment retries and set the
  // subscription to `unpaid`, which normalizeSubscription() collapses to
  // plan='free'. We deliberately key off `unpaid` (not `canceled`) so we
  // never tell a user who *chose* to cancel that their "payment failed" —
  // `canceled` covers both voluntary cancels and Polar's immediate revoke,
  // whereas `unpaid` unambiguously means "we couldn't collect the renewal."
  const revokedForNonPayment = !subscription.isPro && status === 'unpaid';
  const planName = subscription.plan?.name || PLANS.free.name;
  const currentPlanId = row?.plan;
  const activePlan = (currentPlanId && PLANS[currentPlanId]) || null;
  // The plan a Pro user would switch TO — the other paid variant in the group.
  // With two cadences this is simply "the other one"; a third variant would
  // want a picker, but today the switch is an unambiguous binary.
  const otherPlan = subscription.isPro
    ? getPlansInGroup('pro').find((p) => p.id !== currentPlanId) || null
    : null;

  // "Report a billing problem" = a prefilled support email (no ticketing
  // system), with the account + plan context filled in so support has what
  // they need and the user just describes the issue.
  const billingProblemHref = (() => {
    const lines = [
      'Hi EmberFlow team,',
      '',
      "I'd like to report a billing problem.",
      '',
      `Account: ${user?.email || '(your account email)'}`,
      `Current plan: ${planName}${subscription.isPro ? ` (${status})` : ''}`,
      cancelling && row?.current_period_end ? `Scheduled to cancel on ${formatDateTime(row.current_period_end)}` : null,
      '',
      'What happened:',
      '',
      '',
      'Thanks,',
    ].filter((line) => line !== null);
    return `mailto:${COMPANY.supportEmail}?subject=${encodeURIComponent('EmberFlow billing problem')}&body=${encodeURIComponent(lines.join('\n'))}`;
  })();

  return (
    <>
      {/* Rendered outside .subscriptions-page so the page's entrance stagger
          (.subscriptions-page > *) never overrides the overlay's own motion. */}
      {showActivation ? (
        <ProActivation
          activated={subscription.isPro}
          onDone={() => {
            setShowActivation(false);
            confirmAttemptsRef.current = 0;
          }}
        />
      ) : null}

      {/* ProActivation is a full-screen overlay, not a portal -- it visually
          blocks the page below it but Tab order still follows DOM order, so
          a keyboard user could otherwise tab straight into the still-live
          Switch/Cancel/Manage billing controls underneath while the
          celebration is showing (up to ~14s). inert -- the same mechanism
          already used for locked Pro controls elsewhere -- removes this
          whole subtree from the tab order and assistive tech until it's
          done, without needing a separate focus-trap implementation. */}
      <div className="page-stack subscriptions-page" inert={showActivation ? '' : undefined}>
      <div className="page-header">
        <div>
          <p className="eyebrow">Subscriptions</p>
          <h1 className="heading-xl">Plan, billing, and payment history.</h1>
        </div>
      </div>

      {subscription.error ? <Alert variant="danger" title="Couldn't load your subscription">{subscription.error}</Alert> : null}
      {billingError ? <Alert variant="danger" title="Something went wrong">{billingError}</Alert> : null}
      {revokedForNonPayment ? (
        <Alert
          variant="danger"
          title="Your Pro plan ended — we couldn't collect your last payment"
          action={
            <Button
              variant="primary"
              size="sm"
              type="button"
              onClick={() => checkout(selectedCadence)}
              disabled={Boolean(billingAction)}
            >
              {billingAction === selectedCadence ? 'Opening…' : 'Resubscribe to Pro'}
            </Button>
          }
        >
          After several automatic retries the renewal charge still didn't go through, so your account is back on Free — nothing you
          created has been deleted. Resubscribe any time to restore Analytics, Proposals, unlimited invoices, and Brand Studio.
        </Alert>
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
              {earlySupporter && <EarlySupporterBadge />}
            </div>
            <span className="muted small">
              {!row?.current_period_end
                ? 'Free plan — upgrade any time'
                : cancelling
                ? `Access ends ${formatDateTime(row.current_period_end)}`
                : pastDue
                ? 'Payment failed — please update your card'
                : `Renews ${formatDateTime(row.current_period_end)}`}
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
          <Alert variant="neutral" className="subscription-notice" title="Scheduled to cancel">
            You'll keep Pro access until {formatDateTime(row.current_period_end)}, then your account reverts to Free — nothing is
            deleted. You can resume any time before then from the section below.
          </Alert>
        ) : pastDue ? (
          <Alert variant="warning" className="subscription-notice" title="Payment failed — we're retrying">
            Your last payment didn't go through. You keep full Pro access while Polar automatically retries the charge over the next
            few weeks — to fix it now, open Manage billing and update your payment method. If every retry fails, your account returns
            to Free.
          </Alert>
        ) : null}
      </Card>

      {!subscription.isPro ? (
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
          <CardHeader
            title="Switch plan"
            subtitle={cancelling ? 'Your plan is scheduled to cancel.' : `You're on ${planName}.`}
          />
          {cancelling ? (
            <p className="muted small">
              You're set to cancel on {formatDateTime(row.current_period_end)}. Resume below to stay on Pro — then you can switch plans.
            </p>
          ) : otherPlan ? (
            <>
              <p className="muted small">
                Prefer to pay {otherPlan.interval === 'year' ? 'once a year' : 'monthly'}? Switch to {otherPlan.name} — {otherPlan.price}/
                {otherPlan.cadence}. The change takes effect right away and Polar prorates the difference, so you're never on two plans at once.
              </p>
              <div className="form-actions">
                <Button
                  variant="secondary"
                  type="button"
                  onClick={() => setSwitchConfirmOpen(true)}
                  loading={switching}
                  leftIcon={<ArrowLeftRight size={16} />}
                >
                  {switching ? 'Switching…' : `Switch to ${otherPlan.shortName}`}
                </Button>
              </div>
            </>
          ) : null}
        </Card>
      )}

      <Card variant="default">
        <CardHeader title="Billing summary" subtitle="Your plan and payments at a glance." />
        {subscription.isPro ? (
          <>
            <dl className="billing-summary">
              <div className="billing-summary__row">
                <dt><Crown size={16} aria-hidden="true" /> Current plan</dt>
                <dd>{planName}{activePlan ? ` · ${activePlan.price}/${activePlan.cadence}` : ''}</dd>
              </div>
              <div className="billing-summary__row">
                <dt><Calendar size={16} aria-hidden="true" /> {cancelling ? 'Access ends' : 'Renewal date'}</dt>
                <dd>{row?.current_period_end ? formatDateTime(row.current_period_end) : '—'}</dd>
              </div>
              <div className="billing-summary__row">
                <dt><Wallet size={16} aria-hidden="true" /> Last payment</dt>
                <dd>
                  {row?.current_period_start ? formatDateTime(row.current_period_start) : '—'}
                  {activePlan ? ` · ${activePlan.price}` : ''}
                </dd>
              </div>
              <div className="billing-summary__row">
                <dt><CreditCard size={16} aria-hidden="true" /> Next payment</dt>
                <dd>
                  {cancelling
                    ? 'None — plan ends'
                    : pastDue
                    ? 'Retrying…'
                    : row?.current_period_end
                    ? `${activePlan ? `${activePlan.price} · ` : ''}${formatDateTime(row.current_period_end)}`
                    : '—'}
                </dd>
              </div>
            </dl>
            {hasCustomer ? (
              <ItemRow
                as="button"
                type="button"
                onClick={manageBilling}
                loading={billingAction === 'portal'}
                icon={<Receipt size={18} />}
                title="View all invoices"
                subtitle="Receipts and invoice downloads — securely in Polar's portal."
                trailing={<ExternalLink size={16} aria-hidden="true" />}
              />
            ) : null}
          </>
        ) : (
          <p className="muted small">Nothing to show yet — you haven't subscribed to Pro. Your plan and payments appear here once you do.</p>
        )}
      </Card>

      <Card variant="default">
        <CardHeader title="Refund policy" subtitle="Summary — see the full policy for details." />
        <p className="muted small">
          Full refunds are available within 7 days of a charge, for monthly and yearly plans alike — contact support to request one.
          After 7 days, charges aren't refundable. Cancel any time and you'll keep Pro access through the end of the period you already
          paid for — cancelling doesn't prorate a refund for the unused time. (Switching between Monthly and Yearly is different: that
          prorates the price difference automatically, so you're never charged twice — see the FAQ below.)
        </p>
        <Link to="/refund" className="link">Read the full Refund Policy →</Link>
      </Card>

      <Card variant="default">
        <CardHeader title="FAQ" />
        <div className="subscriptions-faq">
          <details>
            <summary>Can I switch between Monthly and Yearly?</summary>
            <p className="muted small">
              Yes — right from this page, and it takes effect immediately. Your subscription switches in place (you never end up on two
              plans), and Polar prorates the difference for the time left on your current plan, so there's no double charge.
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
        <CardHeader title="Billing help" subtitle="A wrong charge, a duplicate, or anything that doesn't look right." />
        <div className="form-actions">
          <Button as="a" href={billingProblemHref} variant="secondary" leftIcon={<MailWarning size={16} />}>
            Report a billing problem
          </Button>
          <Link to="/contact" className="button button--ghost">Contact page</Link>
        </div>
      </Card>

      {subscription.isPro ? (
        cancelling ? (
          <Card variant="default">
            <CardHeader
              title="Subscription ending"
              subtitle={`Pro access continues until ${row?.current_period_end ? formatDateTime(row.current_period_end) : 'the end of your period'}.`}
            />
            <p className="muted small">
              You're set to cancel, so there won't be another renewal. Changed your mind? Resume any time before it ends and nothing else changes.
            </p>
            <div className="form-actions">
              <Button variant="primary" type="button" onClick={doResume} loading={cancelBusy} leftIcon={<RotateCcw size={16} />}>
                {cancelBusy ? 'Resuming…' : 'Resume subscription'}
              </Button>
            </div>
          </Card>
        ) : (
          <Card variant="default" className="danger-zone">
            <div className="danger-zone__header">
              <span className="danger-zone__icon-badge" aria-hidden="true"><ShieldAlert size={16} /></span>
              <div>
                <h3 className="panel__title">Cancel subscription</h3>
                <p className="panel__subtitle">Stop future renewals.</p>
              </div>
            </div>
            <p className="muted small">
              You keep Pro access until {row?.current_period_end ? formatDateTime(row.current_period_end) : 'the end of your current period'},
              then your account reverts to Free automatically — nothing is deleted, and you can resume any time before then.
            </p>
            <div className="form-actions">
              <Button variant="danger" type="button" onClick={() => setCancelConfirmOpen(true)} loading={cancelBusy} leftIcon={<ShieldAlert size={16} />}>
                Cancel subscription
              </Button>
            </div>
          </Card>
        )
      ) : null}

      <ConfirmDialog
        isOpen={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={doCancel}
        title="Cancel your subscription?"
        message={`You'll keep Pro access until ${row?.current_period_end ? formatDateTime(row.current_period_end) : 'the end of your current period'}, then your account reverts to Free — nothing is deleted, and you can resume any time before then.`}
        confirmLabel="Cancel subscription"
        cancelLabel="Never mind"
        variant="danger"
        loading={cancelBusy}
      />

      <ConfirmDialog
        isOpen={switchConfirmOpen}
        onClose={() => setSwitchConfirmOpen(false)}
        onConfirm={() => otherPlan && doSwitch(otherPlan.id)}
        title={otherPlan ? `Switch to ${otherPlan.name}?` : 'Switch plan?'}
        message={
          otherPlan
            ? `Your plan changes to ${otherPlan.name} (${otherPlan.price}/${otherPlan.cadence}) right away. Polar prorates the difference for the time left on your current plan — you stay on a single subscription, with no double charge.`
            : ''
        }
        confirmLabel={otherPlan ? `Switch to ${otherPlan.shortName}` : 'Switch'}
        cancelLabel="Not now"
        variant="info"
        loading={switching}
      />
      </div>
    </>
  );
}
