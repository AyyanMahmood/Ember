// SVG stroke-dasharray/dashoffset ring, following the simplest-correct
// technique found across the reference libraries (HeroUI's ProgressCircle):
// -90deg rotate so 0% starts at 12 o'clock, round linecap. `value` is a
// standard 0-1 fill fraction (1 = fully drawn) — matching how every
// reference ring API (Chakra, Mantine, HeroUI) treats "value", regardless
// of what a consumer's `value` represents domain-wise. `children` is a
// free-form center slot (icon, label, whatever) rather than a fixed
// icon-or-text prop, which is Mantine's `label` idea generalized further.
export function ProgressRing({
  value,
  size = 56,
  thickness = 4,
  variant = 'accent',
  glow = false,
  children,
  className = '',
}) {
  const radius = (size - thickness) / 2;
  const circumference = radius * 2 * Math.PI;
  const center = size / 2;
  const clamped = value === null || value === undefined ? null : Math.min(Math.max(value, 0), 1);

  return (
    <div
      className={`progress-ring progress-ring--${variant} ${glow ? 'progress-ring--glow' : ''} ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={center} cy={center} r={radius} strokeWidth={thickness} className="progress-ring__track" fill="none" />
        {clamped !== null && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            strokeWidth={thickness}
            className="progress-ring__fill"
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - clamped)}
            transform={`rotate(-90 ${center} ${center})`}
          />
        )}
      </svg>
      {children && <div className="progress-ring__content">{children}</div>}
    </div>
  );
}
