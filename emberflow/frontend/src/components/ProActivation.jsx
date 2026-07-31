import { useEffect, useRef, useState } from 'react';
import { EmberLogo } from './ui/EmberLogo.jsx';

// Apple-quality Pro activation sequence. A single, calm signature moment
// (explicitly sanctioned by CLAUDE.md's Motion Rules for events exactly like
// "upgrade success"): a thin ember ring traces once around the centered
// EmberFlow logo, then a warm welcome resolves and dissolves naturally into
// the Subscriptions page. No confetti, particles, or bounce — the motion is
// a single traced ring and soft fades.
//
// It also doubles as the post-checkout confirming state: if entitlement
// isn't synced yet when the ring finishes, it holds on a gentle breathing
// glow until the webhook lands (`activated` flips true), then reveals the
// welcome. Payment already succeeded by the time we're here, so after a
// safety ceiling it proceeds optimistically rather than stranding the user.
const REDUCE = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false;

const TIMING = REDUCE
  ? { trace: 200, welcome: 900, exit: 80, hold: 4000 }
  : { trace: 1650, welcome: 1900, exit: 540, hold: 10000 };

export function ProActivation({ activated = false, onDone }) {
  const [phase, setPhase] = useState('tracing'); // tracing → holding → welcome → exiting
  const activatedRef = useRef(activated);
  activatedRef.current = activated;

  // tracing → (welcome if already entitled, else holding)
  useEffect(() => {
    if (phase !== 'tracing') return undefined;
    const t = setTimeout(() => setPhase(activatedRef.current ? 'welcome' : 'holding'), TIMING.trace);
    return () => clearTimeout(t);
  }, [phase]);

  // holding → welcome once entitlement syncs (or after a safety ceiling)
  useEffect(() => {
    if (phase !== 'holding') return undefined;
    if (activated) {
      setPhase('welcome');
      return undefined;
    }
    const safety = setTimeout(() => setPhase('welcome'), TIMING.hold);
    return () => clearTimeout(safety);
  }, [phase, activated]);

  // welcome → exiting (hold the message, then fade)
  useEffect(() => {
    if (phase !== 'welcome') return undefined;
    const t = setTimeout(() => setPhase('exiting'), TIMING.welcome);
    return () => clearTimeout(t);
  }, [phase]);

  // exiting → done
  useEffect(() => {
    if (phase !== 'exiting') return undefined;
    const t = setTimeout(() => onDone?.(), TIMING.exit);
    return () => clearTimeout(t);
  }, [phase, onDone]);

  const showCaption = phase === 'welcome' || phase === 'exiting';

  return (
    <div
      className={`pro-activation pro-activation--${phase}`}
      role="status"
      aria-live="polite"
      aria-label={showCaption ? 'Welcome to EmberFlow Pro' : 'Activating your Pro subscription'}
    >
      <div className="pro-activation__stage">
        <span className="pro-activation__halo" aria-hidden="true" />
        <svg className="pro-activation__ring" viewBox="0 0 120 120" aria-hidden="true">
          <circle className="pro-activation__ring-track" cx="60" cy="60" r="56" fill="none" />
          <circle className="pro-activation__ring-trace" cx="60" cy="60" r="56" fill="none" strokeLinecap="round" />
        </svg>
        <EmberLogo size={64} className="pro-activation__logo" alt="EmberFlow" />
      </div>

      <div className={`pro-activation__caption${showCaption ? ' is-visible' : ''}`} aria-hidden={!showCaption}>
        <h2 className="pro-activation__title">Welcome to EmberFlow Pro</h2>
        <p className="pro-activation__subtitle">You've unlocked every professional feature.</p>
      </div>
    </div>
  );
}
