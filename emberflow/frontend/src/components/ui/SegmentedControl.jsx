import { useLayoutEffect, useRef, useState } from 'react';

// A 2+ option toggle with a sliding highlight that follows the selected
// option's real measured width, not an assumed equal split. A CSS-only
// `transform: translateX(index * 100%)` (what this replaced) is only
// correct when every option is exactly the same width — true for "Monthly"
// vs "Yearly" only by accident of similar length, and wrong in general
// (longer labels, i18n, more than 2 options). Mantine's FloatingIndicator
// solves this by diffing getBoundingClientRect() between the container and
// the active option; this is a smaller, Ember-scoped version of that idea
// with native <input type="radio"> options instead of a headless primitive,
// which gives keyboard/AT support for free without reimplementing roving
// tabindex.
export function SegmentedControl({
  data,
  value,
  onChange,
  name,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) {
  const containerRef = useRef(null);
  const optionRefs = useRef({});
  const [indicator, setIndicator] = useState(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const target = optionRefs.current[value];
    if (!container || !target) return undefined;

    const measure = () => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      setIndicator({
        transform: `translateX(${targetRect.left - containerRect.left}px)`,
        width: targetRect.width,
      });
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [value, data]);

  return (
    <div
      ref={containerRef}
      className={`segmented-control ${className}`.trim()}
      role="radiogroup"
      aria-label={ariaLabel}
    >
      {indicator && (
        <span
          className="segmented-control__indicator"
          style={{ transform: indicator.transform, width: `${indicator.width}px` }}
          aria-hidden="true"
        />
      )}
      {data.map((option) => {
        const checked = value === option.value;
        return (
          <label
            key={option.value}
            ref={(el) => { optionRefs.current[option.value] = el; }}
            className={`segmented-control__option ${checked ? 'segmented-control__option--checked' : ''}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={checked}
              disabled={disabled || option.disabled}
              onChange={() => onChange(option.value)}
              className="segmented-control__input"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  );
}
