import { useState } from 'react';
import {
  exportItemsToCsv,
  exportNodeToHtml,
  exportNodeToPdf,
  exportToDocx,
  exportToJson,
  exportToMarkdown,
  exportToTxt,
  printNode,
} from './export.js';

/**
 * Shared export-handling logic for InvoiceFormPage, InvoiceDetailPage, and
 * ProposalFormPage — they all wire the same 8 formats to the same
 * documentRef/data/profile shape, so this was identical, copy-pasted
 * switch-statement logic across all three (found during an architectural
 * review). `filename` and `data` are read fresh on every call since this
 * isn't memoized — always pass the current render's values.
 */
export function useDocumentExport({ kind, documentRef, filename, data, profile, onError }) {
  const [exportBusy, setExportBusy] = useState('');

  async function handleExport(format) {
    setExportBusy(format);
    onError?.('');
    try {
      const node = documentRef.current;
      switch (format) {
        case 'pdf': await exportNodeToPdf(node, filename); break;
        case 'print': printNode(node, filename); break;
        case 'html': exportNodeToHtml(node, filename); break;
        case 'markdown': exportToMarkdown(kind, data, profile); break;
        case 'json': exportToJson(kind, data); break;
        case 'csv': exportItemsToCsv(kind, data); break;
        case 'txt': exportToTxt(kind, data, profile); break;
        case 'docx': await exportToDocx(kind, data, profile); break;
        default: break;
      }
    } catch (err) {
      onError?.(err.message);
    } finally {
      setExportBusy('');
    }
  }

  return { exportBusy, handleExport };
}
