import { useEffect, useRef, useState } from 'react';
import { isValidHex } from './color.js';

const PRESETS = [
  '#DC8259', '#2563EB', '#7C3AED', '#DB2777', '#DC2626',
  '#EA580C', '#CA8A04', '#16A34A', '#0D9488', '#0891B2',
  '#4F46E5', '#334155', '#0F172A', '#78716C',
];

const RECENTS_KEY = 'emberflow-recent-colors';

function loadRecents() {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

function saveRecent(hex) {
  try {
    const current = loadRecents().filter((c) => c.toLowerCase() !== hex.toLowerCase());
    const next = [hex, ...current].slice(0, 8);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    return next;
  } catch {
    return loadRecents();
  }
}

function hexToRgbParts(hex) {
  const clean = (isValidHex(hex) ? hex : '#000000').replace('#', '');
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = parseInt(full, 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbPartsToHex({ r, g, b }) {
  const clamp = (v) => Math.max(0, Math.min(255, Number(v) || 0));
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

export function ColorPicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [hexDraft, setHexDraft] = useState(value || '#2563EB');
  const [recents, setRecents] = useState(loadRecents);
  const wrapperRef = useRef(null);

  useEffect(() => {
    setHexDraft(value || '#2563EB');
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    function handleClick(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    function handleKey(event) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const rgb = hexToRgbParts(hexDraft);

  function commit(hex) {
    if (!isValidHex(hex)) return;
    onChange(hex);
    setRecents(saveRecent(hex));
  }

  function updateHexInput(raw) {
    const next = raw.startsWith('#') ? raw : `#${raw}`;
    setHexDraft(next);
    if (isValidHex(next)) commit(next);
  }

  function updateRgbInput(channel, rawValue) {
    const next = rgbPartsToHex({ ...rgb, [channel]: rawValue });
    setHexDraft(next);
    commit(next);
  }

  return (
    <div className="color-picker" ref={wrapperRef}>
      {label && <span className="label">{label}</span>}
      <button
        type="button"
        className="color-picker__trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="color-picker__swatch" style={{ background: isValidHex(value) ? value : '#2563EB' }} />
        <span className="color-picker__value mono">{(value || '#2563EB').toUpperCase()}</span>
      </button>

      {open && (
        <div className="color-picker__panel" role="dialog" aria-label="Color picker">
          <div className="color-picker__preview" style={{ background: isValidHex(hexDraft) ? hexDraft : '#000' }} />

          <div className="color-picker__field-row">
            <label className="color-picker__field">
              <span>Hex</span>
              <input
                type="text"
                value={hexDraft}
                onChange={(e) => updateHexInput(e.target.value)}
                maxLength={7}
                className="mono"
              />
            </label>
          </div>

          <div className="color-picker__field-row color-picker__field-row--rgb">
            {['r', 'g', 'b'].map((channel) => (
              <label className="color-picker__field" key={channel}>
                <span>{channel.toUpperCase()}</span>
                <input
                  type="number"
                  min="0"
                  max="255"
                  value={rgb[channel]}
                  onChange={(e) => updateRgbInput(channel, e.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="color-picker__section">
            <span className="color-picker__section-label">Presets</span>
            <div className="color-picker__swatch-grid">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  className="color-picker__swatch-btn"
                  style={{ background: preset }}
                  aria-label={preset}
                  onClick={() => { setHexDraft(preset); commit(preset); }}
                />
              ))}
            </div>
          </div>

          {recents.length > 0 && (
            <div className="color-picker__section">
              <span className="color-picker__section-label">Recent</span>
              <div className="color-picker__swatch-grid">
                {recents.map((recent) => (
                  <button
                    key={recent}
                    type="button"
                    className="color-picker__swatch-btn"
                    style={{ background: recent }}
                    aria-label={recent}
                    onClick={() => { setHexDraft(recent); commit(recent); }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
