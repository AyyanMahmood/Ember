import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'EmberFlow';
const DEFAULT_DESCRIPTION = 'EmberFlow helps freelancers manage clients, invoices, proposals, and payments in one workspace.';

function siteUrl() {
  const base = (import.meta.env.VITE_APP_URL || window.location.origin).replace(/\/$/, '');
  return base;
}

export function Seo({ title, description = DEFAULT_DESCRIPTION, path = '', noindex = false }) {
  const fullTitle = title ? `${title} · ${SITE_NAME}` : `${SITE_NAME} — Finance OS for Freelancers`;
  const canonical = `${siteUrl()}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex ? <meta name="robots" content="noindex, nofollow" /> : null}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta name="twitter:card" content="summary" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
