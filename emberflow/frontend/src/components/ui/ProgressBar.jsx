// Linear progress bar with an optional semantic-threshold variant, following
// Tremor's ProgressBar (the only reference library with a first-class
// warning/error color variant baked into a progress component). Unlike
// Tremor, Ember derives the variant from thresholds automatically when the
// caller doesn't pin one explicitly — a "danger" tier is added on top of
// Tremor's warning/error pair since usage meters need to distinguish
// "getting close" from "at the limit."
export function ProgressBar({
  value,
  max = 100,
  variant,
  thresholds,
  className = '',
}) {
  const pct = max > 0 ? Math.min(Math.max((value / max) * 100, 0), 100) : 0;

  let resolvedVariant = variant;
  if (!resolvedVariant && thresholds) {
    if (thresholds.danger !== undefined && pct >= thresholds.danger) resolvedVariant = 'danger';
    else if (thresholds.warning !== undefined && pct >= thresholds.warning) resolvedVariant = 'warning';
  }

  return (
    <div className={`progress-bar ${className}`.trim()}>
      <div className="progress-bar__track">
        <div
          className={`progress-bar__fill ${resolvedVariant ? `progress-bar__fill--${resolvedVariant}` : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
