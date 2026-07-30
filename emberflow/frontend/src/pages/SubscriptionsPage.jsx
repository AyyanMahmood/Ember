import { AlertTriangle, Check, ExternalLink, LifeBuoy, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, StatusBadge } from '../components/ui/Badge.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Card, CardHeader } from '../components/ui/Card.jsx';
import { LoadingSpinner } from '../components/ui/Loading.jsx';
import { COMPANY } from '../data/company.js';
import { useSubscription } from '../hooks/useSubscription.js';
import { openBillingPortal, startCheckout } from '../services/subscriptions.js';
import { formatDateTime } from '../utils/format.js';
import { formatLimit, PLANS } from '../utils/plans.js';

function UsageMeter({ label, used, limit }) {
  const unlimited = !Number.isFinite(limit);
  const pct = unlimited ? 0 : Math.min((used / limit) * 100, 100);
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
            className={`usage-meter__fill ${near ? 'usage-meter__fill--warning' : ''}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

const CADENCE_OPTIONS = [
  { plan: 'pro_monthly', ...PLANS.pro_monthly },
  { plan: 'pro_yearly', ...PLANS.pro_yearly },
];

function PlanSelector({ selected, onSelect, disabled }) {
  return (
    <div className="plan-select" role="radiogroup" aria-label="Choose billing cadence">
      {CADENCE_OPTIONS.map((option) => {
        const checked = selected === option.plan;
        return (
          <label key={option.plan} className={`plan-select__option ${checked ? 'plan-select__option--checked' : ''}`}>
            <input
              type="radio"
              name="billing-cadence"
              value={option.plan}
              checked={checked}
              disabled={disabled}
              onChange={() => onSelect(option.plan)}
              className="plan-select__input"
            />
            <span className="plan-select__indicator" aria-hidden="true" />
            <span className="plan-select__body">
              <span className="plan-select__name">{option.name}</span>
              <span className="plan-select__price">
                {option.price}
                <span className="plan-select__cadence">/{option.cadence}</span>
              </span>
            </span>
            {option.plan === 'pro_yearly' && <Badge variant="blue" size="sm">Best value</Badge>}
          </label>
        );
      })}
    </div>
  );
}

export default function SubscriptionsPage() {
  const subscription = useSubscription();
  const [selectedCadence, setSelectedCadence] = useState('pro_yearly');
  const [billingAction, setBillingAction] = useState('');
  const [billingError, setBillingError] = useState('');

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
    <div className="page-stack">
      <div className="page-header">
        <div>
          <p className="eyebrow">Subscriptions</p>
          <h1 className="heading-xl">Plan, billing, and payment history.</h1>
        </div>
      </div>

      {subscription.error ? <Card variant="default"><div className="error-panel" role="alert">{subscription.error}</div></Card> : null}
      {billingError ? <Card variant="default"><p className="form-error" role="alert">{billingError}</p></Card> : null}

      <Card variant="default">
        <CardHeader
          title={planName}
          subtitle="Current plan"
          action={
            <div className="panel__actions-row">
              {subscription.isPro && <StatusBadge status={cancelling ? 'pending' : status === 'active' ? 'paid' : status} />}
              {hasCustomer ? (
                <Button variant="ghost" type="button" onClick={manageBilling} disabled={billingAction === 'portal'} leftIcon={<ExternalLink size={16} />}>
                  {billingAction === 'portal' ? 'Opening...' : 'Manage billing'}
                </Button>
              ) : null}
            </div>
          }
        />
        <div className="subscription-grid">
          <UsageMeter label="Invoice usage" used={subscription.usage.invoicesThisMonth} limit={subscription.invoiceLimit} />
          <UsageMeter label="Client usage" used={subscription.usage.clients} limit={subscription.clientLimit} />
          <div>
            <span className="muted small">{cancelling ? 'Access ends' : 'Renews'}</span>
            <strong>{row?.current_period_end ? formatDateTime(row.current_period_end) : '-'}</strong>
          </div>
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
          <PlanSelector selected={selectedCadence} onSelect={setSelectedCadence} disabled={Boolean(billingAction)} />
          <div className="form-actions">
            <Button variant="primary" type="button" onClick={() => checkout(selectedCadence)} disabled={Boolean(billingAction)}>
              {billingAction === selectedCadence ? 'Opening...' : `Upgrade — ${PLANS[selectedCadence].price}/${PLANS[selectedCadence].cadence}`}
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
          <div className="form-actions">
            <p className="muted small" style={{ marginBottom: 0, marginRight: 'auto' }}>
              Handled by Polar's secure customer portal — view past payments, download invoices, and update your payment method there.
            </p>
            <Button variant="secondary" type="button" onClick={manageBilling} disabled={billingAction === 'portal'} leftIcon={<ExternalLink size={16} />}>
              {billingAction === 'portal' ? 'Opening...' : 'View billing history'}
            </Button>
          </div>
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
          <CardHeader
            title="Danger zone"
            subtitle="Cancel your subscription."
            action={<AlertTriangle size={18} className="danger-zone__icon" aria-hidden="true" />}
          />
          <p className="muted small">
            Cancelling stops future renewals. You keep Pro access until {row?.current_period_end ? formatDateTime(row.current_period_end) : 'the end of your current period'},
            then your account reverts to Free automatically — nothing is deleted.
          </p>
          <div className="form-actions">
            <Button variant="danger" type="button" onClick={manageBilling} disabled={billingAction === 'portal'} leftIcon={<ShieldAlert size={16} />}>
              {billingAction === 'portal' ? 'Opening...' : 'Cancel subscription'}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
