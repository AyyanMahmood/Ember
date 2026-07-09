import { formatDate, formatMoney } from './format.js';

const page = {
  width: 210,
  margin: 18,
};

function addHeader(doc, title, profile) {
  doc.setFillColor(profile?.invoice_brand_color || '#2563eb');
  doc.rect(0, 0, page.width, 28, 'F');
  doc.setTextColor('#ffffff');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, page.margin, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(profile?.business_name || profile?.full_name || 'Freelancer', page.width - page.margin, 18, {
    align: 'right',
  });
  doc.setTextColor('#111111');
}

async function addLogo(doc, profile) {
  if (!profile?.logo_url) return;
  try {
    const response = await fetch(profile.logo_url);
    const blob = await response.blob();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const format = blob.type.includes('png') ? 'PNG' : 'JPEG';
    doc.addImage(dataUrl, format, page.margin, 34, 24, 24);
  } catch {
    doc.setFont('helvetica', 'bold');
    doc.text(profile.business_name || profile.full_name || 'Logo', page.margin, 42);
  }
}

function addWrappedText(doc, text, x, y, width, lineHeight = 6) {
  const lines = doc.splitTextToSize(text || '', width);
  doc.text(lines, x, y);
  return y + lines.length * lineHeight;
}

export async function exportInvoicePdf(invoice, profile) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  addHeader(doc, `Invoice ${invoice.invoice_number}`, profile);
  await addLogo(doc, profile);

  let y = 42;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('From', page.margin, y);
  doc.text('Bill To', 118, y);
  doc.setFont('helvetica', 'normal');
  y += 7;
  addWrappedText(
    doc,
    [profile?.business_name || profile?.full_name, profile?.email].filter(Boolean).join('\n'),
    profile?.logo_url ? page.margin + 30 : page.margin,
    y,
    profile?.logo_url ? 44 : 74
  );
  addWrappedText(
    doc,
    [invoice.clients?.name, invoice.clients?.company, invoice.clients?.email].filter(Boolean).join('\n'),
    118,
    y,
    74
  );

  y = 78;
  doc.setFont('helvetica', 'bold');
  doc.text('Invoice date', page.margin, y);
  doc.text('Due date', 72, y);
  doc.text('Status', 126, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(invoice.invoice_date), page.margin, y + 7);
  doc.text(formatDate(invoice.due_date), 72, y + 7);
  doc.text(invoice.status.toUpperCase(), 126, y + 7);

  y = 106;
  doc.setFillColor('#f3efe7');
  doc.rect(page.margin, y - 6, 174, 10, 'F');
  doc.setFont('helvetica', 'bold');
  doc.text('Item', page.margin + 2, y);
  doc.text('Qty', 112, y, { align: 'right' });
  doc.text('Price', 140, y, { align: 'right' });
  doc.text('Tax', 164, y, { align: 'right' });
  doc.text('Total', 192, y, { align: 'right' });
  y += 10;

  doc.setFont('helvetica', 'normal');
  invoice.invoice_items.forEach((item) => {
    const subtotal = Number(item.quantity) * Number(item.price);
    const tax = subtotal * (Number(item.tax_rate) / 100);
    const lineTotal = subtotal + tax;
    const descriptionLines = doc.splitTextToSize(item.description, 78);
    doc.text(descriptionLines, page.margin + 2, y);
    doc.text(String(item.quantity), 112, y, { align: 'right' });
    doc.text(formatMoney(item.price, invoice.currency), 140, y, { align: 'right' });
    doc.text(`${Number(item.tax_rate).toFixed(2)}%`, 164, y, { align: 'right' });
    doc.text(formatMoney(lineTotal, invoice.currency), 192, y, { align: 'right' });
    y += Math.max(9, descriptionLines.length * 6);
    if (y > 250) {
      doc.addPage();
      y = 24;
    }
  });

  y += 6;
  doc.setDrawColor('#ddd7ca');
  doc.line(118, y, 192, y);
  y += 9;
  doc.text('Subtotal', 136, y);
  doc.text(formatMoney(invoice.subtotal, invoice.currency), 192, y, { align: 'right' });
  y += 8;
  doc.text('Tax', 136, y);
  doc.text(formatMoney(invoice.tax_total, invoice.currency), 192, y, { align: 'right' });
  y += 8;
  doc.text('Discount', 136, y);
  doc.text(`-${formatMoney(invoice.discount_total || 0, invoice.currency)}`, 192, y, { align: 'right' });
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Total', 136, y);
  doc.text(formatMoney(invoice.total, invoice.currency), 192, y, { align: 'right' });

  if (invoice.notes) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes', page.margin, y + 16);
    doc.setFont('helvetica', 'normal');
    addWrappedText(doc, invoice.notes, page.margin, y + 24, 84, 5);
  }

  if (profile?.payment_instructions) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Payment instructions', 118, y + 16);
    doc.setFont('helvetica', 'normal');
    addWrappedText(doc, profile.payment_instructions, 118, y + 24, 74, 5);
  }

  if (profile?.invoice_footer) {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    addWrappedText(doc, profile.invoice_footer, page.margin, 282, 174, 5);
  }

  doc.save(`${invoice.invoice_number}.pdf`);
}

export async function exportProposalPdf(proposal, profile) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  addHeader(doc, proposal.title || 'Project Proposal', profile);
  let y = 44;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared for', page.margin, y);
  doc.setFont('helvetica', 'normal');
  y = addWrappedText(doc, proposal.client_name, page.margin, y + 8, 174);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Project overview', page.margin, y);
  doc.setFont('helvetica', 'normal');
  y = addWrappedText(doc, proposal.project_summary, page.margin, y + 8, 174);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Scope of work', page.margin, y);
  doc.setFont('helvetica', 'normal');
  y = addWrappedText(doc, proposal.scope, page.margin, y + 8, 174);

  y += 8;
  doc.setFont('helvetica', 'bold');
  doc.text('Timeline', page.margin, y);
  doc.text('Investment', 118, y);
  doc.setFont('helvetica', 'normal');
  doc.text(proposal.timeline || '-', page.margin, y + 8);
  doc.text(formatMoney(proposal.amount, proposal.currency), 118, y + 8);

  if (proposal.proposal_items?.length) {
    y += 24;
    doc.setFont('helvetica', 'bold');
    doc.text('Pricing breakdown', page.margin, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    proposal.proposal_items.forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.text(item.title, page.margin, y);
      doc.text(formatMoney(item.amount, proposal.currency), 192, y, { align: 'right' });
      y += 6;
      if (item.description) {
        doc.setFont('helvetica', 'normal');
        y = addWrappedText(doc, item.description, page.margin, y, 150, 5);
      }
      y += 3;
      if (y > 260) {
        doc.addPage();
        y = 24;
      }
    });
  }

  doc.save(`${(proposal.title || 'proposal').replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.pdf`);
}
