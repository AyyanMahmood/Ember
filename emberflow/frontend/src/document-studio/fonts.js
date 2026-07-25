// Curated Brand Studio font registry. Deliberately small (4 options, not a
// font-library picker) -- see CLAUDE.md Brand Studio phase notes. Inter is
// already loaded globally for the whole app (main.jsx), so it needs no
// dynamic import; the other three are self-hosted via @fontsource and only
// fetched the moment a document actually needs them (selected in Brand
// Studio, or rendered in a preview/PDF export for a profile that has one
// set) -- everyone who never touches Brand Studio pays zero bytes for them.

export const BRAND_FONTS = [
  {
    id: 'inter',
    label: 'Inter',
    description: 'Clean, neutral, highly legible. The EmberFlow default.',
    stack: "'Inter', ui-sans-serif, system-ui, sans-serif",
    category: 'sans',
  },
  {
    id: 'manrope',
    label: 'Manrope',
    description: 'Geometric and modern, a touch warmer than Inter.',
    stack: "'Manrope', ui-sans-serif, system-ui, sans-serif",
    category: 'sans',
  },
  {
    id: 'space-grotesk',
    label: 'Space Grotesk',
    description: 'Distinctive, confident -- stands out on a cover page.',
    stack: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
    category: 'sans',
  },
  {
    id: 'fraunces',
    label: 'Fraunces',
    description: 'Editorial serif for a more classic, agency feel.',
    stack: "'Fraunces', Georgia, 'Times New Roman', serif",
    category: 'serif',
  },
];

export const DEFAULT_BRAND_FONT = 'inter';

export function getBrandFont(id) {
  return BRAND_FONTS.find((f) => f.id === id) || BRAND_FONTS.find((f) => f.id === DEFAULT_BRAND_FONT);
}

const loaders = {
  manrope: () => import('@fontsource/manrope/latin-400.css')
    .then(() => Promise.all([
      import('@fontsource/manrope/latin-500.css'),
      import('@fontsource/manrope/latin-700.css'),
      import('@fontsource/manrope/latin-800.css'),
    ])),
  'space-grotesk': () => import('@fontsource/space-grotesk/latin-400.css')
    .then(() => Promise.all([
      import('@fontsource/space-grotesk/latin-500.css'),
      import('@fontsource/space-grotesk/latin-700.css'),
    ])),
  fraunces: () => import('@fontsource/fraunces/latin-400.css')
    .then(() => Promise.all([
      import('@fontsource/fraunces/latin-500.css'),
      import('@fontsource/fraunces/latin-600.css'),
      import('@fontsource/fraunces/latin-400-italic.css'),
    ])),
};

const loaded = new Set(['inter']);
const pending = new Map();

// Idempotent: repeated calls for the same font id share one in-flight
// import and resolve instantly once it's already been loaded once.
export function loadBrandFont(id) {
  if (loaded.has(id) || !loaders[id]) return Promise.resolve();
  if (pending.has(id)) return pending.get(id);
  const promise = loaders[id]().then(() => {
    loaded.add(id);
    pending.delete(id);
  });
  pending.set(id, promise);
  return promise;
}
