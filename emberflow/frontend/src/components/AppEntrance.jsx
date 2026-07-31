import { EmberLogo } from './ui/EmberLogo.jsx';

// The moment of entering the app. Rather than snapping the full interface in,
// the EmberFlow logo anchors the screen for a beat, then dissolves as the
// interface settles in beneath it — so entering EmberFlow feels like one
// cohesive place, not another page load (the Apple/Arc/Linear touch).
//
// Purely presentational: AppLayout owns the `entering` timing and the
// matching `.app-shell--entering` class that settles `.content` in. The
// fade-out is CSS (`app-entrance-out`), neutralized under prefers-reduced-
// motion by the global guard, so this is safe to mount unconditionally.
export function AppEntrance() {
  return (
    <div className="app-entrance" aria-hidden="true">
      <EmberLogo size={72} className="app-entrance__logo" alt="EmberFlow" />
    </div>
  );
}
