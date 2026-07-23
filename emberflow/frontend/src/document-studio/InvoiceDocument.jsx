import { forwardRef } from 'react';
import { DocumentTemplate } from './DocumentTemplate.jsx';
import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';
import { getTheme } from './themes.js';
import { derivePalette } from './color.js';

export const InvoiceDocument = forwardRef(function InvoiceDocument({ invoice, profile, themeId }, ref) {
  const theme = getTheme(themeId || invoice?.template);
  const palette = derivePalette(profile?.invoice_brand_color);
  const items = invoice?.invoice_items || [];
  const paidAmount = (invoice?.payments || []).reduce((sum, row) => sum + Number(row.amount || 0), 0);
  const balanceDue = Math.max(Number(invoice?.total || 0) - paidAmount, 0);

  const body = (
    <table className="doc-table">
      <thead>
        <tr>
          <th>Item</th>
          <th className="doc-table__num">Qty</th>
          <th className="doc-table__num">Price</th>
          <th className="doc-table__num">Tax</th>
          <th className="doc-table__num">Total</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item, index) => {
          const subtotal = Number(item.quantity) * Number(item.price);
          const tax = subtotal * (Number(item.tax_rate) / 100);
          return (
            <tr key={item.id || index}>
              <td>{item.description}</td>
              <td className="doc-table__num">{item.quantity}</td>
              <td className="doc-table__num">{formatMoney(item.price, invoice?.currency)}</td>
              <td className="doc-table__num">{Number(item.tax_rate || 0).toFixed(2)}%</td>
              <td className="doc-table__num">{formatMoney(subtotal + tax, invoice?.currency)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );

  const totals = (
    <div className="doc-totals">
      <div className="doc-totals__row">
        <span>Subtotal</span>
        <span>{formatMoney(invoice?.subtotal, invoice?.currency)}</span>
      </div>
      <div className="doc-totals__row">
        <span>Tax</span>
        <span>{formatMoney(invoice?.tax_total, invoice?.currency)}</span>
      </div>
      {Number(invoice?.discount_total) > 0 && (
        <div className="doc-totals__row">
          <span>Discount</span>
          <span>-{formatMoney(invoice.discount_total, invoice?.currency)}</span>
        </div>
      )}
      <div className="doc-totals__row doc-totals__row--total">
        <span>Total</span>
        <span>{formatMoney(invoice?.total, invoice?.currency)}</span>
      </div>
      {paidAmount > 0 && (
        <>
          <div className="doc-totals__row">
            <span>Paid</span>
            <span>{formatMoney(paidAmount, invoice?.currency)}</span>
          </div>
          <div className="doc-totals__row">
            <span>Balance due</span>
            <span>{formatMoney(balanceDue, invoice?.currency)}</span>
          </div>
        </>
      )}
    </div>
  );

  const notes = (invoice?.notes || profile?.payment_instructions) && (
    <div className="doc-notes">
      {invoice?.notes && (
        <div>
          <h4>Notes</h4>
          <p>{invoice.notes}</p>
        </div>
      )}
      {profile?.payment_instructions && (
        <div>
          <h4>Payment instructions</h4>
          <p>{profile.payment_instructions}</p>
        </div>
      )}
    </div>
  );

  return (
    <DocumentTemplate
      ref={ref}
      theme={theme}
      palette={palette}
      documentType="invoice"
      documentTitle="Invoice"
      documentSubtitle={invoice?.invoice_number}
      statusSlot={<span className="doc-status">{effectiveStatus(invoice)}</span>}
      profile={profile}
      logoUrl={profile?.logo_url}
      fromBlock={(
        <>
          <strong>{profile?.business_name || profile?.full_name}</strong>
          {profile?.email && <span>{profile.email}</span>}
          {profile?.address && <span>{profile.address}</span>}
        </>
      )}
      toBlock={(
        <>
          <strong>{invoice?.clients?.name}</strong>
          {invoice?.clients?.company && <span>{invoice.clients.company}</span>}
          {invoice?.clients?.email && <span>{invoice.clients.email}</span>}
        </>
      )}
      metaItems={[
        { label: 'Invoice date', value: formatDate(invoice?.invoice_date) },
        { label: 'Due date', value: formatDate(invoice?.due_date) },
        { label: 'Currency', value: invoice?.currency },
      ]}
      body={body}
      totals={totals}
      notes={notes}
      footerText={profile?.invoice_footer}
    />
  );
});

InvoiceDocument.displayName = 'InvoiceDocument';
