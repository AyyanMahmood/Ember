import { AlertTriangle, Crown, ExternalLink, LifeBuoy, Receipt, ShieldAlert, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { ConfirmDialog } from '../components/ui/Modal.jsx';
import { COMPANY } from '../data/company.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { openBillingPortal, startCheckout } from '../services/subscriptions.js';
import { formatDateTime } from '../utils/format.js';
import { formatLimit, PLANS, planPriceValue } from '../utils/plans.js';

function UsageMeter({ label, used, limit }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
  const critical = !unlimited && pct >= 95;
  const near = !unlimited && pct >= 80;

  return (
    <div className="usage-meter">
      <div className="usage-meter__header">
        <span className="muted small">{label}</span>
        <strong>{used} / {formatLimit(limit)}</strong>
      </div>
      {!unlimited && (
        <div className="usage-meter__track">
          <div
            className={`usage-meter__fill ${critical ? 'usage-meter__fill--danger' : near ? 'usage-meter__fill--warning' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

// Ring showing how far through the current billing period the account is —
// full right after renewal, empties as the next charge/expiry approaches.
// Returns no fill (just the track) if there's no period to measure against
// (e.g. Free, or a row still loading).
function RenewalRing({ startIso, endIso, size = 56, strokeWidth = 4, children }) {
  const pct = useMemo(() => {
    if (!startIso || !endIso) return null;
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    const now = Date.now();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    return Math.min(Math.max((now - start) / (end - start), 0), 1);
  }, [startIso, endIso]);

  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;

  return (
    <div className="renewal-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} strokeWidth={strokeWidth} className="renewal-ring__track" fill="none" />
        {pct !== null && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={strokeWidth}
            className="renewal-ring__fill"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * pct}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      <div className="renewal-ring__icon">{children}</div>
    </div>
  );
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

// Animates toward `target` with a plain requestAnimationFrame loop (no
// framer-motion dependency) using the same "count toward a value" technique
// motion libraries use internally, just without the spring math. Tracks the
// live displayed value in a ref (not just the committed target) so an
// interrupted animation — toggling cadence again mid-count — resumes from
// wherever it visually was instead of jumping.
function useAnimatedNumber(target, duration = 500) {
  const [value, setValue] = useState(target);
  const displayRef = useRef(target);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      displayRef.current = target;
      setValue(target);
      return;
    }
    if (displayRef.current === target) return;

    const from = displayRef.current;
    const start = performance.now();
    let frame;

    function tick(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = 1 - (1 - elapsed) ** 3;
      const next = from + (target - from) * eased;
      displayRef.current = next;
      setValue(next);
      if (elapsed < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        displayRef.current = target;
        setValue(target);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  return value;
}

const CADENCE_OPTIONS = [
  { plan: 'pro_monthly', ...PLANS.pro_monthly, label: 'Monthly' },
  { plan: 'pro_yearly', ...PLANS.pro_yearly, label: 'Yearly' },
];

function CadenceToggle({ selected, onSelect, disabled }) {
  const index = CADENCE_OPTIONS.findIndex((option) => option.plan === selected);

  return (
    <div className="cadence-toggle" role="radiogroup" aria-label="Choose billing cadence">
      <span className="cadence-toggle__thumb" style={{ transform: `translateX(${index * 100}%)` }} aria-hidden="true" />
      {CADENCE_OPTIONS.map((option) => (
        <label
          key={option.plan}
          className={`cadence-toggle__option ${selected === option.plan ? 'cadence-toggle__option--checked' : ''}`}
        >
          <input
            type="radio"
            name="billing-cadence"
            value={option.plan}
            checked={selected === option.plan}
            disabled={disabled}
            onChange={() => onSelect(option.plan)}
            className="cadence-toggle__input"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

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

      <Card variant="default" className="plan-hero">
        <div className="plan-hero__top">
          <RenewalRing startIso={row?.current_period_start} endIso={row?.current_period_end}>
            {subscription.isPro ? <Crown size={20} aria-hidden="true" /> : <Sparkles size={20} aria-hidden="true" />}
          </RenewalRing>
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

      {!subscription.isPro ? (
        <Card variant="default">
          <CardHeader title="Upgrade to Pro" subtitle="Choose a billing cadence." />
          <div className="cadence-picker">
            <CadenceToggle selected={selectedCadence} onSelect={setSelectedCadence} disabled={Boolean(billingAction)} />
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
            Polar (our billing provider) doesn't yet support switching a subscription's plan in place. To move between Monthly and
            Yearly, cancel your current plan from Manage billing — you'll keep Pro until it ends — then subscribe to the other
            cadence from here once it does.
          </p>
        </Card>
      )}

      <Card variant="default">
        <CardHeader title="Billing history & invoices" subtitle="Payment history, receipts, and invoice downloads." />
        {hasCustomer ? (
          <button type="button" className="subscription-item" onClick={manageBilling} disabled={billingAction === 'portal'}>
            <span className="subscription-item__icon" aria-hidden="true"><Receipt size={18} /></span>
            <span className="subscription-item__body">
              <span className="subscription-item__title">View in Polar's customer portal</span>
              <span className="subscription-item__subtitle">Past payments, receipts, and invoice downloads — handled securely by Polar.</span>
            </span>
            {billingAction === 'portal' ? (
              <span className="spinner spinner--sm" role="status" aria-label="Opening" />
            ) : (
              <ExternalLink size={16} aria-hidden="true" className="subscription-item__chevron" />
            )}
          </button>
        ) : (
          <p className="muted small">Nothing to show yet — you haven't subscribed to Pro. History and invoices appear here once you do.</p>
        )}
      </Card>

      <Card variant="default">
        <CardHeader title="Refund policy" subtitle="Summary — see the full policy for details." />
        <p className="muted small">
          Full refund within 7 days of any charge, on both Monthly and Yearly plans — email support and we'll process it, no
          questions asked. Outside that window, cancel any time and you'll keep Pro access through the end of the period you already
          paid for; we don't prorate partial periods.
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
              the other cadence. This is a limitation of Polar's current API, not a restriction we chose.
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
            <span className="danger-zone__icon-badge" aria-hidden="true"><AlertTriangle size={16} /></span>
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
