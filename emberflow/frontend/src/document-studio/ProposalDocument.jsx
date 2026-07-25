import { forwardRef, useEffect } from 'react';
import { DocumentTemplate } from './DocumentTemplate.jsx';
import { formatMoney } from '../utils/format.js';
import { getTheme } from './themes.js';
import { derivePalette } from './color.js';
import { getBrandFont, loadBrandFont } from './fonts.js';

export const ProposalDocument = forwardRef(function ProposalDocument({ proposal, profile, themeId }, ref) {
  const theme = getTheme(themeId || proposal?.template);
  const palette = derivePalette(profile?.invoice_brand_color, profile?.brand_accent_color);
  const fontFamily = getBrandFont(profile?.brand_font).stack;

  useEffect(() => {
    loadBrandFont(profile?.brand_font);
  }, [profile?.brand_font]);
  const items = proposal?.proposal_items || [];

  const body = (
    <>
      <div className="doc-notes">
        <div>
          <h4>Project overview</h4>
          <p>{proposal?.project_summary}</p>
        </div>
        <div>
          <h4>Scope of work</h4>
          <p>{proposal?.scope}</p>
        </div>
      </div>
      {items.length > 0 && (
        <table className="doc-table">
          <thead>
            <tr>
              <th>Item</th>
              <th className="doc-table__num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id || index}>
                <td>
                  <strong>{item.title}</strong>
                  {item.description && <div>{item.description}</div>}
                </td>
                <td className="doc-table__num">{formatMoney(item.amount, proposal?.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  const totals = (
    <div className="doc-totals">
      <div className="doc-totals__row doc-totals__row--total">
        <span>Investment</span>
        <span>{formatMoney(proposal?.amount, proposal?.currency)}</span>
      </div>
    </div>
  );

  return (
    <DocumentTemplate
      ref={ref}
      theme={theme}
      palette={palette}
      fontFamily={fontFamily}
      documentType="proposal"
      documentTitle="Proposal"
      documentSubtitle={proposal?.title}
      profile={profile}
      logoUrl={profile?.logo_url}
      fromBlock={(
        <>
          <strong>{profile?.business_name || profile?.full_name}</strong>
          {profile?.email && <span>{profile.email}</span>}
        </>
      )}
      toBlock={<strong>{proposal?.client_name}</strong>}
      metaItems={[
        { label: 'Timeline', value: proposal?.timeline || '—' },
        { label: 'Currency', value: proposal?.currency },
      ]}
      body={body}
      totals={totals}
      footerText={profile?.invoice_footer}
    />
  );
});

ProposalDocument.displayName = 'ProposalDocument';
