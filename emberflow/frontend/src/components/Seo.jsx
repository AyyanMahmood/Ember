import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'EmberFlow';
const DEFAULT_DESCRIPTION = 'EmberFlow helps freelancers manage clients, invoices, proposals, and payments in one workspace.';

function siteUrl() {
  const base = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
  return base;
}

// Builds a BreadcrumbList (https://schema.org/BreadcrumbList) from a simple
// [{ name, path }] trail. `path` is optional on the last (current) crumb.
function buildBreadcrumbJsonLd(breadcrumbs, base) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: `${base}${crumb.path}` } : {}),
    })),
  };
}

/**
 * Ember <Seo> — every route's single source of truth for <title>,
 * description, canonical, OpenGraph, Twitter Card, robots directives, and
 * structured data (react-helmet-async, see main.jsx's <HelmetProvider>).
 *
 * Props:
 *  - title:        page-specific title; combined as "{title} · EmberFlow"
 *                   (home page passes none and gets the full brand title)
 *  - description:  falls back to a sensible site-wide default
 *  - path:         canonical path, e.g. "/pricing" — also used to build
 *                   og:url and any breadcrumb `item` URLs
 *  - noindex:      utility/auth pages that shouldn't compete for rankings
 *  - jsonLd:       a schema.org object, or array of objects, to inject
 *  - breadcrumbs:  optional [{ name, path? }] trail -> BreadcrumbList JSON-LD
 *                   (merged with `jsonLd`, not a replacement for it)
 */
export function Seo({ title, description = DEFAULT_DESCRIPTION, path = '', noindex = false, jsonLd, breadcrumbs }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Finance OS for Freelancers`;
  const base = siteUrl();
  const canonical = `${base}${path}`;
  // 1200x630 — the standard OpenGraph/Twitter landscape size, so link
  // unfurls on Slack/iMessage/X/LinkedIn/Discord show a full preview card
  // instead of the small cropped square a logo-only image renders as.
  const imageUrl = `${base}/og-image.jpg`;

  const jsonLdBlocks = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
  const breadcrumbBlock = buildBreadcrumbJsonLd(breadcrumbs, base);
  const allJsonLd = breadcrumbBlock ? [...jsonLdBlocks, breadcrumbBlock] : jsonLdBlocks;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow'} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content="en_US" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/jpeg" />
      <meta property="og:image:alt" content={`${SITE_NAME} — the finance operating system for freelancers`} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      {allJsonLd.map((block, index) => (
        <script key={index} type="application/ld+json">{JSON.stringify(block)}</script>
      ))}
    </Helmet>
  );
}
