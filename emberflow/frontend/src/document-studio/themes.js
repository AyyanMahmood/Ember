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
    forceDark: true,
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
