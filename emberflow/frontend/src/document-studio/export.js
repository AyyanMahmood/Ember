import { formatDate, formatMoney } from '../utils/format.js';
import { effectiveStatus } from '../utils/invoice.js';

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function downloadText(content, filename, mime = 'text/plain;charset=utf-8') {
  download(new Blob([content], { type: mime }), filename);
}

function safeFileStem(value) {
  return (value || 'document').toString().replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '');
}

// ── Normalize invoice/proposal into one flat shape the text-based exporters share ──

function normalizeDocument(kind, data, profile) {
  if (kind === 'invoice') {
    const items = (data.invoice_items || []).map((item) => {
      const subtotal = Number(item.quantity) * Number(item.price);
      const tax = subtotal * (Number(item.tax_rate) / 100);
      return {
        label: item.description,
        quantity: item.quantity,
        price: item.price,
        taxRate: item.tax_rate,
        lineTotal: subtotal + tax,
      };
    });
    return {
      kind,
      title: `Invoice ${data.invoice_number}`,
      fileStem: data.invoice_number || 'invoice',
      from: { name: profile?.business_name || profile?.full_name, email: profile?.email, address: profile?.address },
      to: { name: data.clients?.name, company: data.clients?.company, email: data.clients?.email },
      meta: [
        ['Invoice date', formatDate(data.invoice_date)],
        ['Due date', formatDate(data.due_date)],
        ['Status', effectiveStatus(data)],
        ['Currency', data.currency],
      ],
      items,
      totals: [
        ['Subtotal', formatMoney(data.subtotal, data.currency)],
        ['Tax', formatMoney(data.tax_total, data.currency)],
        ['Discount', `-${formatMoney(data.discount_total || 0, data.currency)}`],
        ['Total', formatMoney(data.total, data.currency)],
      ],
      notes: data.notes,
      footer: profile?.invoice_footer,
    };
  }

  const items = (data.proposal_items || []).map((item) => ({
    label: item.title,
    description: item.description,
    lineTotal: item.amount,
  }));
  return {
    kind,
    title: data.title || 'Proposal',
    fileStem: data.title || 'proposal',
    from: { name: profile?.business_name || profile?.full_name, email: profile?.email },
    to: { name: data.client_name },
    meta: [
      ['Timeline', data.timeline || '-'],
      ['Currency', data.currency],
    ],
    summary: data.project_summary,
    scope: data.scope,
    items,
    totals: [['Investment', formatMoney(data.amount, data.currency)]],
    footer: profile?.invoice_footer,
  };
}

// ── PDF (html2canvas snapshot of the exact DOM node used for preview) ──

export async function exportNodeToPdf(node, filename) {
  if (!node) throw new Error('Nothing to export yet.');
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')]);

  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#FFFFFF',
    windowWidth: node.scrollWidth,
    windowHeight: node.scrollHeight,
  });

  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const imgData = canvas.toDataURL('image/png');

  if (imgHeight <= pageHeight) {
    pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
  } else {
    // Paginate: slice the tall canvas into page-height chunks.
    let renderedHeight = 0;
    const pxPerPt = canvas.width / imgWidth;
    const pageHeightPx = pageHeight * pxPerPt;
    let first = true;
    while (renderedHeight < canvas.height) {
      const sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedHeight);
      const sliceCanvas = document.createElement('canvas');
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext('2d');
      ctx.drawImage(canvas, 0, renderedHeight, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
      const sliceData = sliceCanvas.toDataURL('image/png');
      if (!first) pdf.addPage();
      pdf.addImage(sliceData, 'PNG', 0, 0, imgWidth, sliceHeightPx / pxPerPt);
      renderedHeight += sliceHeightPx;
      first = false;
    }
  }

  pdf.save(`${safeFileStem(filename)}.pdf`);
}

// ── Print (same DOM node, via a dedicated print window) ──

export function printNode(node, title) {
  if (!node) throw new Error('Nothing to print yet.');
  const documentCss = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');

  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) throw new Error('Pop-up blocked — allow pop-ups to print.');
  printWindow.document.write(`<!doctype html><html><head><title>${title || 'Document'}</title><style>${documentCss}
    @page { margin: 0; }
    body { margin: 0; display: flex; justify-content: center; background: #fff; }
  </style></head><body>${node.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

// ── HTML (standalone file, same markup + styles) ──

export function exportNodeToHtml(node, filename) {
  if (!node) throw new Error('Nothing to export yet.');
  const documentCss = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n');
      } catch {
        return '';
      }
    })
    .join('\n');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${filename}</title><style>${documentCss}</style></head><body style="margin:0;display:flex;justify-content:center;background:#f2f2f2;padding:24px;">${node.outerHTML}</body></html>`;
  downloadText(html, `${safeFileStem(filename)}.html`, 'text/html;charset=utf-8');
}

// ── Markdown / TXT / JSON / CSV (data-driven, shared normalizer) ──

export function exportToMarkdown(kind, data, profile) {
  const doc = normalizeDocument(kind, data, profile);
  const lines = [`# ${doc.title}`, ''];
  lines.push(`**From:** ${doc.from.name || ''}${doc.from.email ? ` <${doc.from.email}>` : ''}`);
  lines.push(`**To:** ${doc.to.name || ''}${doc.to.company ? ` (${doc.to.company})` : ''}`);
  lines.push('');
  doc.meta.forEach(([label, value]) => lines.push(`- **${label}:** ${value}`));
  lines.push('');
  if (doc.summary) lines.push('## Project overview', '', doc.summary, '');
  if (doc.scope) lines.push('## Scope of work', '', doc.scope, '');
  if (doc.items?.length) {
    lines.push('## Items', '');
    if (kind === 'invoice') {
      lines.push('| Item | Qty | Price | Tax | Total |', '| --- | --- | --- | --- | --- |');
      doc.items.forEach((item) => {
        lines.push(`| ${item.label} | ${item.quantity} | ${formatMoney(item.price, data.currency)} | ${Number(item.taxRate || 0).toFixed(2)}% | ${formatMoney(item.lineTotal, data.currency)} |`);
      });
    } else {
      lines.push('| Item | Description | Amount |', '| --- | --- | --- |');
      doc.items.forEach((item) => {
        lines.push(`| ${item.label} | ${item.description || ''} | ${formatMoney(item.lineTotal, data.currency)} |`);
      });
    }
    lines.push('');
  }
  lines.push('## Totals', '');
  doc.totals.forEach(([label, value]) => lines.push(`- **${label}:** ${value}`));
  if (doc.notes) lines.push('', '## Notes', '', doc.notes);
  if (doc.footer) lines.push('', '---', '', doc.footer);

  downloadText(lines.join('\n'), `${safeFileStem(doc.fileStem)}.md`, 'text/markdown;charset=utf-8');
}

export function exportToTxt(kind, data, profile) {
  const doc = normalizeDocument(kind, data, profile);
  const rule = '-'.repeat(48);
  const lines = [doc.title, rule, ''];
  lines.push(`From: ${doc.from.name || ''}${doc.from.email ? ` <${doc.from.email}>` : ''}`);
  lines.push(`To: ${doc.to.name || ''}${doc.to.company ? ` (${doc.to.company})` : ''}`);
  lines.push('');
  doc.meta.forEach(([label, value]) => lines.push(`${label}: ${value}`));
  lines.push('');
  if (doc.summary) lines.push('PROJECT OVERVIEW', doc.summary, '');
  if (doc.scope) lines.push('SCOPE OF WORK', doc.scope, '');
  if (doc.items?.length) {
    lines.push('ITEMS', rule);
    doc.items.forEach((item) => {
      lines.push(`${item.label}${item.description ? ` — ${item.description}` : ''}: ${formatMoney(item.lineTotal, data.currency)}`);
    });
    lines.push('');
  }
  lines.push('TOTALS', rule);
  doc.totals.forEach(([label, value]) => lines.push(`${label}: ${value}`));
  if (doc.notes) lines.push('', 'NOTES', doc.notes);
  if (doc.footer) lines.push('', rule, doc.footer);

  downloadText(lines.join('\n'), `${safeFileStem(doc.fileStem)}.txt`);
}

export function exportToJson(kind, data) {
  downloadText(JSON.stringify(data, null, 2), `${safeFileStem(kind === 'invoice' ? data.invoice_number : data.title)}.json`, 'application/json;charset=utf-8');
}

function csvEscape(value) {
  const str = String(value ?? '');
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function exportItemsToCsv(kind, data) {
  const rows = kind === 'invoice'
    ? [['Description', 'Quantity', 'Price', 'Tax rate', 'Line total'], ...(data.invoice_items || []).map((item) => {
        const subtotal = Number(item.quantity) * Number(item.price);
        const tax = subtotal * (Number(item.tax_rate) / 100);
        return [item.description, item.quantity, item.price, item.tax_rate, (subtotal + tax).toFixed(2)];
      })]
    : [['Title', 'Description', 'Amount'], ...(data.proposal_items || []).map((item) => [item.title, item.description || '', item.amount])];

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\r\n');
  downloadText(csv, `${safeFileStem(kind === 'invoice' ? data.invoice_number : data.title)}-items.csv`, 'text/csv;charset=utf-8');
}

// ── DOCX (structured, via the docx library — not pixel-identical to the
//    visual template, but preserves the document's formatting/structure) ──

export async function exportToDocx(kind, data, profile) {
  const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, WidthType } = await import('docx');
  const doc = normalizeDocument(kind, data, profile);

  const heading = (text) => new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 } });
  const body = (text) => new Paragraph({ children: [new TextRun(text || '')], spacing: { after: 120 } });

  const children = [
    new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE, spacing: { after: 200 } }),
    new Paragraph({
      children: [new TextRun({ text: `From: ${doc.from.name || ''}`, bold: true })],
    }),
    body(doc.from.email || ''),
    new Paragraph({
      children: [new TextRun({ text: `To: ${doc.to.name || ''}`, bold: true })],
      spacing: { before: 120 },
    }),
    body(doc.to.company || doc.to.email || ''),
  ];

  doc.meta.forEach(([label, value]) => {
    children.push(new Paragraph({ children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(String(value))] }));
  });

  if (doc.summary) { children.push(heading('Project overview')); children.push(body(doc.summary)); }
  if (doc.scope) { children.push(heading('Scope of work')); children.push(body(doc.scope)); }

  if (doc.items?.length) {
    children.push(heading('Items'));
    const headerCells = kind === 'invoice' ? ['Item', 'Qty', 'Price', 'Tax', 'Total'] : ['Item', 'Description', 'Amount'];
    const rows = [new TableRow({
      children: headerCells.map((text) => new TableCell({
        width: { size: 100 / headerCells.length, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })],
      })),
    })];
    doc.items.forEach((item) => {
      const cells = kind === 'invoice'
        ? [item.label, String(item.quantity), formatMoney(item.price, data.currency), `${Number(item.taxRate || 0).toFixed(2)}%`, formatMoney(item.lineTotal, data.currency)]
        : [item.label, item.description || '', formatMoney(item.lineTotal, data.currency)];
      rows.push(new TableRow({
        children: cells.map((text) => new TableCell({ children: [new Paragraph(String(text))] })),
      }));
    });
    children.push(new Table({ rows, width: { size: 100, type: WidthType.PERCENTAGE } }));
  }

  children.push(heading('Totals'));
  doc.totals.forEach(([label, value]) => {
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: `${label}: `, bold: true }), new TextRun(String(value))],
    }));
  });

  if (doc.notes) { children.push(heading('Notes')); children.push(body(doc.notes)); }
  if (doc.footer) { children.push(new Paragraph({ spacing: { before: 300 }, children: [new TextRun({ text: doc.footer, italics: true })] })); }

  const docxFile = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(docxFile);
  download(blob, `${safeFileStem(doc.fileStem)}.docx`);
}
