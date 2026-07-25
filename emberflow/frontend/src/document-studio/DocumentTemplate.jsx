import { forwardRef } from 'react';

// Fixed true render size (US Letter @ 96dpi). The live preview scales this
// DOWN visually with a CSS transform on an OUTER wrapper — the node exported
// here is never itself resized, so PDF/print/image export always captures
// the exact same pixels the user sees, just without the display scale.
export const DOCUMENT_PAGE_WIDTH = 816;
export const DOCUMENT_PAGE_HEIGHT = 1056;

/**
 * DocumentTemplate — the one shared renderer both invoice and proposal
 * documents run through. `theme.layout` selects the structural arrangement;
 * `palette` (see color.js) supplies the derived brand colors. Everything
 * else is passed in as content slots so this file doesn't need to know
 * anything about invoices or proposals specifically.
 */
export const DocumentTemplate = forwardRef(function DocumentTemplate({
  theme,
  palette,
  fontFamily,
  documentType,
  documentTitle,
  documentSubtitle,
  statusSlot,
  profile,
  logoUrl,
  fromBlock,
  toBlock,
  metaItems = [],
  body,
  totals,
  notes,
  footerText,
}, ref) {
  const isSidebar = theme.layout === 'sidebar';
  const isDark = Boolean(theme.forceDark);

  const style = {
    '--doc-primary': palette.primary,
    '--doc-primary-dark': palette.primaryDark,
    '--doc-primary-light': palette.primaryLight,
    '--doc-accent': palette.accent,
    '--doc-secondary': palette.secondary,
    '--doc-soft': palette.soft,
    '--doc-soft-strong': palette.softStrong,
    '--doc-on-primary': palette.onPrimary,
    width: `${DOCUMENT_PAGE_WIDTH}px`,
    minHeight: `${DOCUMENT_PAGE_HEIGHT}px`,
    // Brand Studio's chosen font wins over the theme's own default/serif
    // stack (inline style beats the .doc-page--serif class rule at equal
    // specificity) -- Brand Studio applies to every theme uniformly.
    ...(fontFamily ? { '--doc-font': fontFamily } : {}),
  };

  const headerBlock = (
    <header className="doc-header">
      {logoUrl ? (
        <img src={logoUrl} alt="" className="doc-header__logo" crossOrigin="anonymous" />
      ) : (
        <div className="doc-header__logo doc-header__logo--placeholder">
          {(profile?.business_name || profile?.full_name || 'B').slice(0, 1)}
        </div>
      )}
      <div className="doc-header__identity">
        <strong>{profile?.business_name || profile?.full_name || 'Your business'}</strong>
        {profile?.email && <span>{profile.email}</span>}
      </div>
      <div className="doc-header__title-block">
        <span className="doc-header__title">{documentTitle}</span>
        {documentSubtitle && <span className="doc-header__subtitle">{documentSubtitle}</span>}
        {statusSlot}
      </div>
    </header>
  );

  const partiesBlock = (
    <section className="doc-parties">
      <div className="doc-party">
        <span className="doc-party__label">From</span>
        {fromBlock}
      </div>
      <div className="doc-party">
        <span className="doc-party__label">{documentType === 'proposal' ? 'Prepared for' : 'Bill to'}</span>
        {toBlock}
      </div>
    </section>
  );

  const metaBlock = metaItems.length > 0 && (
    <section className="doc-meta">
      {metaItems.map((item) => (
        <div className="doc-meta__item" key={item.label}>
          <span className="doc-meta__label">{item.label}</span>
          <span className="doc-meta__value">{item.value}</span>
        </div>
      ))}
    </section>
  );

  const footerBlock = footerText && <footer className="doc-footer">{footerText}</footer>;

  const content = (
    <>
      {headerBlock}
      {partiesBlock}
      {metaBlock}
      <div className="doc-body">{body}</div>
      {totals}
      {notes}
      {footerBlock}
    </>
  );

  return (
    <div
      ref={ref}
      className={`doc-page doc-page--${theme.layout} ${isDark ? 'doc-page--dark' : ''} ${theme.serif ? 'doc-page--serif' : ''}`}
      style={style}
      data-theme-id={theme.id}
    >
      {isSidebar ? (
        <div className="doc-sidebar-shell">
          <aside className="doc-sidebar">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="doc-sidebar__logo" crossOrigin="anonymous" />
            ) : (
              <div className="doc-sidebar__logo doc-sidebar__logo--placeholder">
                {(profile?.business_name || profile?.full_name || 'B').slice(0, 1)}
              </div>
            )}
            <strong className="doc-sidebar__business">{profile?.business_name || profile?.full_name || 'Your business'}</strong>
            {profile?.email && <span className="doc-sidebar__email">{profile.email}</span>}
            <div className="doc-sidebar__title-block">
              <span className="doc-sidebar__title">{documentTitle}</span>
              {documentSubtitle && <span className="doc-sidebar__subtitle">{documentSubtitle}</span>}
              {statusSlot}
            </div>
            {metaItems.length > 0 && (
              <div className="doc-sidebar__meta">
                {metaItems.map((item) => (
                  <div className="doc-sidebar__meta-item" key={item.label}>
                    <span>{item.label}</span>
                    <strong>{item.value}</strong>
                  </div>
                ))}
              </div>
            )}
            {footerText && <p className="doc-sidebar__footer">{footerText}</p>}
          </aside>
          <div className="doc-sidebar-main">
            {partiesBlock}
            <div className="doc-body">{body}</div>
            {totals}
            {notes}
          </div>
        </div>
      ) : (
        content
      )}
    </div>
  );
});

DocumentTemplate.displayName = 'DocumentTemplate';
