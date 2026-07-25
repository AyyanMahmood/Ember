// Curated Brand Studio font registry -- deliberately curated, not a full
// font-library picker (see CLAUDE.md Brand Studio phase notes). Inter is
// already loaded globally for the whole app (main.jsx), so it needs no
// dynamic import; every other font is self-hosted via @fontsource and only
// fetched the moment a document actually needs it (selected in Brand
// Studio, or rendered in a preview/PDF export for a profile that has one
// set) -- everyone who never touches Brand Studio pays zero bytes for them.
//
// Satoshi (from the requested 8-font list) is deliberately NOT included:
// it isn't published on @fontsource/npm at all (unlike the other 7, which
// are all Google Fonts or Vercel's Geist) -- it's only distributable via
// Fontshare's own font files/CDN, a different licensing and hosting path
// than every other font here. Flagged to the user rather than silently
// bundling third-party font binaries without confirming that's wanted.

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
    id: 'geist',
    label: 'Geist',
    description: "Vercel's own grotesk -- crisp, technical, modern SaaS.",
    stack: "'Geist Sans', ui-sans-serif, system-ui, sans-serif",
    category: 'sans',
  },
  {
    id: 'ibm-plex-sans',
    label: 'IBM Plex Sans',
    description: 'Grounded and precise, a quietly corporate-premium feel.',
    stack: "'IBM Plex Sans', ui-sans-serif, system-ui, sans-serif",
    category: 'sans',
  },
  {
    id: 'plus-jakarta-sans',
    label: 'Plus Jakarta Sans',
    description: 'Friendly geometric sans with a bit more personality.',
    stack: "'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif",
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
  geist: () => import('@fontsource/geist-sans/latin-400.css')
    .then(() => Promise.all([
      import('@fontsource/geist-sans/latin-500.css'),
      import('@fontsource/geist-sans/latin-600.css'),
      import('@fontsource/geist-sans/latin-700.css'),
    ])),
  'ibm-plex-sans': () => import('@fontsource/ibm-plex-sans/latin-400.css')
    .then(() => Promise.all([
      import('@fontsource/ibm-plex-sans/latin-500.css'),
      import('@fontsource/ibm-plex-sans/latin-600.css'),
    ])),
  'plus-jakarta-sans': () => import('@fontsource/plus-jakarta-sans/latin-400.css')
    .then(() => Promise.all([
      import('@fontsource/plus-jakarta-sans/latin-500.css'),
      import('@fontsource/plus-jakarta-sans/latin-600.css'),
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
