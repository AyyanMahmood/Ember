import { Check, Lock, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { DOCUMENT_THEMES } from './themes.js';
import { InvoiceDocument } from './InvoiceDocument.jsx';
import { ProposalDocument } from './ProposalDocument.jsx';
import { DOCUMENT_PAGE_WIDTH, DOCUMENT_PAGE_HEIGHT } from './DocumentTemplate.jsx';

const THUMB_WIDTH = 220;
const THUMB_SCALE = THUMB_WIDTH / DOCUMENT_PAGE_WIDTH;

function ThemeThumbnail({ kind, data, profile, themeId }) {
  return (
    <div className="template-selector__thumb-frame" style={{ height: DOCUMENT_PAGE_HEIGHT * THUMB_SCALE }}>
      <div
        className="template-selector__thumb-scale"
        style={{ width: DOCUMENT_PAGE_WIDTH, height: DOCUMENT_PAGE_HEIGHT, transform: `scale(${THUMB_SCALE})` }}
      >
        {kind === 'invoice' ? (
          <InvoiceDocument invoice={data} profile={profile} themeId={themeId} />
        ) : (
          <ProposalDocument proposal={data} profile={profile} themeId={themeId} />
        )}
      </div>
    </div>
  );
}

export function TemplateSelector({
  isOpen,
  onClose,
  kind,
  data,
  profile,
  value,
  onChange,
  isPro,
  onRequestUpgrade,
}) {
  const [query, setQuery] = useState('');
  const [focusIndex, setFocusIndex] = useState(0);
  const cardRefs = useRef([]);
  const searchRef = useRef(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return DOCUMENT_THEMES;
    return DOCUMENT_THEMES.filter((t) => t.name.toLowerCase().includes(term) || t.description.toLowerCase().includes(term));
  }, [query]);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setFocusIndex(0);
      const timer = setTimeout(() => searchRef.current?.focus(), 40);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      const columns = window.innerWidth < 720 ? 1 : window.innerWidth < 1100 ? 2 : 3;
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        setFocusIndex((current) => {
          let next = current;
          if (event.key === 'ArrowRight') next = current + 1;
          if (event.key === 'ArrowLeft') next = current - 1;
          if (event.key === 'ArrowDown') next = current + columns;
          if (event.key === 'ArrowUp') next = current - columns;
          next = Math.max(0, Math.min(filtered.length - 1, next));
          cardRefs.current[next]?.focus();
          return next;
        });
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filtered.length, onClose]);

  if (!isOpen) return null;

  function selectTheme(theme) {
    if (theme.isPremium && !isPro) {
      onRequestUpgrade?.();
      return;
    }
    onChange(theme.id);
    onClose();
  }

  return (
    <div className="template-selector-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="template-selector" role="dialog" aria-modal="true" aria-label="Choose a template">
        <div className="template-selector__header">
          <div className="template-selector__search">
            <Search size={16} aria-hidden="true" />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search templates…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Search templates"
            />
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close template selector">
            <X size={18} />
          </button>
        </div>

        <div className="template-selector__grid" role="listbox" aria-label="Templates">
          {filtered.map((theme, index) => {
            const locked = theme.isPremium && !isPro;
            const selected = theme.id === value;
            return (
              <button
                key={theme.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                type="button"
                role="option"
                aria-selected={selected}
                className={`template-selector__card ${selected ? 'template-selector__card--selected' : ''} ${locked ? 'template-selector__card--locked' : ''}`}
                onClick={() => selectTheme(theme)}
                tabIndex={index === focusIndex ? 0 : -1}
                onFocus={() => setFocusIndex(index)}
                style={{ animationDelay: `${index * 22}ms` }}
              >
                <div className="template-selector__preview">
                  <ThemeThumbnail kind={kind} data={data} profile={profile} themeId={theme.id} />
                  {locked && (
                    <div className="template-selector__lock">
                      <Lock size={16} />
                      <span>Pro</span>
                    </div>
                  )}
                  {selected && (
                    <div className="template-selector__check">
                      <Check size={14} />
                    </div>
                  )}
                </div>
                <div className="template-selector__meta">
                  <strong>{theme.name}</strong>
                  <span>{theme.description}</span>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <p className="template-selector__empty muted">No templates match “{query}”.</p>
          )}
        </div>
      </div>
    </div>
  );
}
