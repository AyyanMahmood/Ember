// Theme registry shared by invoices AND proposals. Each theme is a set of
// structural + typographic tokens consumed by DocumentTemplate — this is why
// there are only 8 themes to design, not 16 (8 invoice + 8 proposal) separate
// one-off files. `layout` selects a structural arrangement (see
// DocumentTemplate.jsx); `serif` swaps the heading font to a system serif
// stack so we get real typographic variety without adding a new font
// dependency (html2canvas/print only ever sees fonts already loaded for the
// app, so this stays within Inter + system-safe serif/mono stacks).

export const DOCUMENT_THEMES = [
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean sans-serif with a bold accent bar. A confident default.',
    layout: 'standard',
    serif: false,
    isPremium: false,
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'No color blocks — just typography, whitespace, and one hairline.',
    layout: 'minimal',
    serif: false,
    isPremium: false,
  },
  {
    id: 'executive',
    name: 'Executive',
    description: 'Formal two-column header, serif headings, restrained color.',
    layout: 'formal',
    serif: true,
    isPremium: true,
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Structured letterhead with a boxed info panel and solid table header.',
    layout: 'boxed',
    serif: false,
    isPremium: true,
  },
  {
    id: 'creative',
    name: 'Creative',
    description: 'Bold oversized title with an angled accent panel.',
    layout: 'angled',
    serif: false,
    isPremium: true,
  },
  {
    id: 'elegant',
    name: 'Elegant',
    description: 'Centered serif editorial layout with thin accent hairlines.',
    layout: 'centered',
    serif: true,
    isPremium: true,
  },
  {
    id: 'dark',
    name: 'Dark',
    description: 'A true dark-background document — light text, glowing accent.',
    layout: 'standard',
    serif: false,
    isPremium: true,
    forceDark: true,
  },
  {
    id: 'ember-signature',
    name: 'Ember Signature',
    description: "EmberFlow's flagship: a dark sidebar column beside a light content area.",
    layout: 'sidebar',
    serif: false,
    isPremium: true,
    // Deliberately no forceDark: the sidebar layout's own CSS (.doc-sidebar/
    // .doc-sidebar-main) already gets its dark-column/light-content split by
    // swapping which of --doc-ink/--doc-bg each side uses -- forceDark would
    // flip both variables globally and invert that split (light sidebar,
    // dark main), the opposite of this theme's own description. That
    // combination is real and looks good, just different -- see
    // "signature-reverse" below.
  },
  {
    id: 'ledger',
    name: 'Ledger',
    description: 'Dense, tabular, precise — a statement-style layout for the numbers-first client.',
    layout: 'ledger',
    serif: false,
    isPremium: false,
  },
  {
    id: 'stub',
    name: 'Stub',
    description: 'Classic tear-off remittance stub, reimagined — totals sit in their own detachable-looking panel.',
    layout: 'stub',
    serif: false,
    isPremium: true,
  },
  {
    id: 'masthead',
    name: 'Masthead',
    description: 'Editorial, newspaper-style header — an oversized wordmark and a thin byline rule.',
    layout: 'masthead',
    serif: true,
    isPremium: true,
  },
  {
    id: 'technical',
    name: 'Technical',
    description: 'Monospace figures and labels against a clean sans body — built for developers and technical studios.',
    layout: 'technical',
    serif: false,
    isPremium: true,
  },
  {
    id: 'duotone',
    name: 'Duotone',
    description: 'A bold color spine along the edge with a vertical wordmark — modern, light-footprint color.',
    layout: 'duotone',
    serif: false,
    isPremium: true,
  },
  {
    id: 'corporate-noir',
    name: 'Corporate Noir',
    description: 'The Corporate letterhead panel, reworked for a true dark background.',
    layout: 'boxed',
    serif: false,
    isPremium: true,
    forceDark: true,
  },
  {
    id: 'formal-noir',
    name: 'Formal Noir',
    description: "Executive's two-column serif header, at midnight — restrained and severe.",
    layout: 'formal',
    serif: true,
    isPremium: true,
    forceDark: true,
  },
  {
    id: 'signature-reverse',
    name: 'Signature Reverse',
    description: "Ember Signature's column arrangement, flipped — a light label column beside a dramatic dark canvas.",
    layout: 'sidebar',
    serif: false,
    isPremium: true,
    forceDark: true,
  },
  {
    id: 'swiss',
    name: 'Swiss',
    description: "Elegant's centered composition, stripped of serif for a minimalist grid-first read.",
    layout: 'centered',
    serif: false,
    isPremium: true,
  },
];

export const FREE_THEME_IDS = DOCUMENT_THEMES.filter((t) => !t.isPremium).map((t) => t.id);
export const DEFAULT_THEME_ID = 'modern';

export function getTheme(id) {
  return DOCUMENT_THEMES.find((t) => t.id === id) || DOCUMENT_THEMES.find((t) => t.id === DEFAULT_THEME_ID);
}

export function isPremiumTheme(id) {
  return Boolean(getTheme(id).isPremium);
}
