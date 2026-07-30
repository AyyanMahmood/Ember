// Icon + title/subtitle + trailing-content row, for lists like billing
// history, activity feeds, or any "leading icon, two lines of text, trailing
// action" pattern. Combines Chakra DataList's label/value semantic split
// (title/subtitle here) with Mantine List's icon-slot convention, plus a
// hover/pressed affordance none of the reference libraries' *presentational*
// list components ship by default (Chakra's DataList and Mantine's List are
// both display-only) — Ember's version is interactive-first since that's
// the common case in this app (a row that opens something).
export function ItemRow({
  as: Component = 'div',
  icon,
  title,
  subtitle,
  trailing,
  loading = false,
  className = '',
  disabled = false,
  ...props
}) {
  return (
    <Component className={`item-row ${className}`.trim()} disabled={loading || disabled} {...props}>
      {icon && <span className="item-row__icon" aria-hidden="true">{icon}</span>}
      <span className="item-row__body">
        <span className="item-row__title">{title}</span>
        {subtitle && <span className="item-row__subtitle">{subtitle}</span>}
      </span>
      {(loading || trailing) && (
        <span className="item-row__trailing">
          {loading ? <span className="spinner spinner--sm" role="status" aria-label="Loading" /> : trailing}
        </span>
      )}
    </Component>
  );
}
