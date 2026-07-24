import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * EmberSelect — the app's themed replacement for a native <select> dropdown.
 *
 * A button trigger opens a floating listbox styled in the Ember design language
 * (matte surface, large radius, soft shadow, accent focus) instead of the
 * platform-native menu. Optionally searchable, which matters for long datasets
 * (currencies, countries). One reusable component consumed everywhere a themed
 * picker is needed.
 *
 * Keyboard: Enter/Space/ArrowDown opens; ArrowUp/Down move the active option;
 * Enter selects; Escape closes and restores focus to the trigger; Home/End jump
 * to the first/last match. Outside click / blur closes.
 *
 * `value` is matched against `options[].value`. A value with no matching option
 * (e.g. legacy free-text data) is shown verbatim on the trigger so nothing is
 * lost, and is simply replaced once the user picks from the list.
 */
export function EmberSelect({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select…',
  searchable = false,
  disabled = false,
  required = false,
  error,
  hint,
  id: providedId,
  emptyMessage = 'No matches',
  leftIcon,
  className = '',
}) {
  const generatedId = useId();
  const id = providedId || generatedId;
  const listboxId = `${id}-listbox`;
  const labelId = `${id}-label`;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const hasError = Boolean(error);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value]
  );

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query, searchable]);

  const describedBy = [hasError ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined;

  function openMenu() {
    if (disabled) return;
    const selectedIdx = filtered.findIndex((option) => option.value === value);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
    setOpen(true);
  }

  function closeMenu({ restoreFocus = true } = {}) {
    setOpen(false);
    setQuery('');
    if (restoreFocus) triggerRef.current?.focus();
  }

  function selectOption(option) {
    if (!option) return;
    onChange?.(option.value);
    closeMenu();
  }

  // Focus the search field (or the list) once the menu opens.
  useEffect(() => {
    if (!open) return;
    if (searchable) searchRef.current?.focus();
    else listRef.current?.focus();
  }, [open, searchable]);

  // Keep the active option scrolled into view.
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = listRef.current?.querySelector(`[data-index="${activeIndex}"]`);
    node?.scrollIntoView({ block: 'nearest' });
  }, [open, activeIndex]);

  // Close on outside pointer.
  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event) {
      if (!containerRef.current?.contains(event.target)) closeMenu({ restoreFocus: false });
    }
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  function moveActive(delta) {
    if (filtered.length === 0) return;
    setActiveIndex((prev) => {
      const next = prev + delta;
      if (next < 0) return 0;
      if (next > filtered.length - 1) return filtered.length - 1;
      return next;
    });
  }

  function onKeyDown(event) {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) openMenu();
        else moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (open) moveActive(-1);
        break;
      case 'Home':
        if (open) { event.preventDefault(); setActiveIndex(0); }
        break;
      case 'End':
        if (open) { event.preventDefault(); setActiveIndex(filtered.length - 1); }
        break;
      case 'Enter':
        if (open) { event.preventDefault(); selectOption(filtered[activeIndex]); }
        break;
      case 'Escape':
        if (open) { event.preventDefault(); closeMenu(); }
        break;
      case 'Tab':
        if (open) closeMenu({ restoreFocus: false });
        break;
      default:
        break;
    }
  }

  const triggerLabel = selectedOption?.label || (value ? String(value) : '');

  return (
    <div className={`input-wrapper ${className}`.trim()} ref={containerRef}>
      {label && (
        <span className="label" id={labelId}>
          {label}
          {required && <span aria-hidden="true" style={{ color: 'var(--color-danger)', marginLeft: 'var(--space-1)' }}>*</span>}
        </span>
      )}

      <div className="ember-select">
        <button
          type="button"
          ref={triggerRef}
          id={id}
          className={`ember-select__trigger${hasError ? ' ember-select__trigger--error' : ''}`}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-labelledby={label ? `${labelId} ${id}` : undefined}
          aria-invalid={hasError}
          aria-describedby={describedBy}
          disabled={disabled}
          onClick={() => (open ? closeMenu() : openMenu())}
          onKeyDown={onKeyDown}
        >
          {leftIcon && <span className="ember-select__icon" aria-hidden="true">{leftIcon}</span>}
          <span className={`ember-select__value${triggerLabel ? '' : ' ember-select__value--placeholder'}`}>
            {triggerLabel || placeholder}
          </span>
          <ChevronDown size={16} className="ember-select__chevron" aria-hidden="true" />
        </button>

        {open && (
          <div className="ember-select__panel">
            {searchable && (
              <div className="ember-select__search">
                <Search size={15} aria-hidden="true" />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  placeholder="Search…"
                  aria-label={label ? `Search ${label}` : 'Search'}
                  aria-controls={listboxId}
                  autoComplete="off"
                  onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
                  onKeyDown={onKeyDown}
                />
              </div>
            )}

            <ul
              ref={listRef}
              className="ember-select__list"
              id={listboxId}
              role="listbox"
              tabIndex={searchable ? -1 : 0}
              aria-label={label || undefined}
              aria-activedescendant={activeIndex >= 0 && filtered[activeIndex] ? `${id}-opt-${activeIndex}` : undefined}
              onKeyDown={searchable ? undefined : onKeyDown}
            >
              {filtered.length === 0 ? (
                <li className="ember-select__empty" role="presentation">{emptyMessage}</li>
              ) : (
                filtered.map((option, index) => {
                  const isSelected = option.value === value;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={option.value}
                      id={`${id}-opt-${index}`}
                      data-index={index}
                      role="option"
                      aria-selected={isSelected}
                      className={`ember-select__option${isActive ? ' ember-select__option--active' : ''}${isSelected ? ' ember-select__option--selected' : ''}`}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectOption(option)}
                    >
                      <span className="ember-select__option-label">{option.label}</span>
                      {isSelected && <Check size={15} aria-hidden="true" />}
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p id={errorId} className="input-error" role="alert">{error}</p>}
      {hint && !error && <p id={hintId} className="input-hint">{hint}</p>}
    </div>
  );
}
